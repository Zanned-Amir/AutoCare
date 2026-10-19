package tn.autocare.maintenance.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.maintenance.api.MaintenanceReminderDue;
import tn.autocare.maintenance.dto.MaintenanceReminderResponse;
import tn.autocare.maintenance.dto.SaveMaintenanceReminderRequest;
import tn.autocare.maintenance.entity.MaintenanceReminder;
import tn.autocare.maintenance.repository.MaintenanceReminderRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.vehicle.api.VehicleDto;
import tn.autocare.vehicle.api.VehicleFacade;

/** Maintenance the client plans on a vehicle, and the daily "it is due" notification. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MaintenanceReminderService {

	private static final ZoneId TUNIS = ZoneId.of("Africa/Tunis");

	private final MaintenanceReminderRepository reminderRepository;

	private final VehicleFacade vehicleFacade;

	private final CatalogFacade catalogFacade;

	private final ApplicationEventPublisher events;

	public List<MaintenanceReminderResponse> listVehicleReminders(Long ownerId, Long vehicleId) {
		VehicleDto vehicle = ownedVehicle(ownerId, vehicleId);
		LocalDate today = LocalDate.now(TUNIS);
		return reminderRepository.findAllByVehicleIdOrderByDoneAtDescDueDateAscIdAsc(vehicleId)
			.stream()
			.map(reminder -> toResponse(reminder, today, vehicle.mileage()))
			.toList();
	}

	@Transactional
	public MaintenanceReminderResponse createVehicleReminder(Long ownerId, Long vehicleId,
			SaveMaintenanceReminderRequest request) {
		VehicleDto vehicle = ownedVehicle(ownerId, vehicleId);
		check(request);
		MaintenanceReminder reminder = reminderRepository.save(MaintenanceReminder.plan(vehicleId, ownerId,
				request.serviceId(), request.title(), request.dueDate(), request.dueMileage(), request.note()));
		return toResponse(reminder, LocalDate.now(TUNIS), vehicle.mileage());
	}

	@Transactional
	public MaintenanceReminderResponse updateVehicleReminder(Long ownerId, Long vehicleId, Long reminderId,
			SaveMaintenanceReminderRequest request) {
		VehicleDto vehicle = ownedVehicle(ownerId, vehicleId);
		check(request);
		MaintenanceReminder reminder = find(vehicleId, reminderId);
		reminder.update(request.serviceId(), request.title(), request.dueDate(), request.dueMileage(), request.note());
		return toResponse(reminder, LocalDate.now(TUNIS), vehicle.mileage());
	}

	@Transactional
	public MaintenanceReminderResponse completeVehicleReminder(Long ownerId, Long vehicleId, Long reminderId) {
		VehicleDto vehicle = ownedVehicle(ownerId, vehicleId);
		MaintenanceReminder reminder = find(vehicleId, reminderId);
		reminder.markDone(Instant.now());
		return toResponse(reminder, LocalDate.now(TUNIS), vehicle.mileage());
	}

	@Transactional
	public void deleteVehicleReminder(Long ownerId, Long vehicleId, Long reminderId) {
		ownedVehicle(ownerId, vehicleId);
		reminderRepository.delete(find(vehicleId, reminderId));
	}

	@Transactional
	public void deleteVehicleReminders(Long vehicleId) {
		reminderRepository.deleteAllByVehicleId(vehicleId);
	}

	/** Notifies each reminder once when it becomes due; returns how many were sent. */
	@Transactional
	public int notifyDueReminders(LocalDate today) {
		Map<Long, Optional<VehicleDto>> vehicles = new HashMap<>();
		Instant now = Instant.now();
		int sent = 0;
		for (MaintenanceReminder reminder : reminderRepository.findAllByDoneAtIsNullAndNotifiedAtIsNull()) {
			Optional<VehicleDto> vehicle = vehicles.computeIfAbsent(reminder.getVehicleId(),
					vehicleFacade::findVehicle);
			if (vehicle.isEmpty() || !reminder.isDue(today, vehicle.get().mileage())) {
				continue;
			}
			reminder.markNotified(now);
			events.publishEvent(new MaintenanceReminderDue(reminder.getId(), reminder.getOwnerId(),
					reminder.getVehicleId(), reminder.getTitle(), reminder.getDueDate(), reminder.getDueMileage()));
			sent++;
		}
		return sent;
	}

	private void check(SaveMaintenanceReminderRequest request) {
		if (request.dueDate() == null && request.dueMileage() == null) {
			throw new AppException(ErrorCode.MAINTENANCE_REMINDER_DUE_REQUIRED, "A due date or mileage is required");
		}
		if (request.serviceId() != null && catalogFacade.findAutoService(request.serviceId()).isEmpty()) {
			throw AppException.notFound("AutoService", request.serviceId());
		}
	}

	private VehicleDto ownedVehicle(Long ownerId, Long vehicleId) {
		if (!vehicleFacade.isVehicleOwnedBy(vehicleId, ownerId)) {
			throw AppException.notFound("Vehicle", vehicleId);
		}
		return vehicleFacade.getVehicle(vehicleId);
	}

	private MaintenanceReminder find(Long vehicleId, Long reminderId) {
		return reminderRepository.findByIdAndVehicleId(reminderId, vehicleId)
			.orElseThrow(() -> AppException.notFound("MaintenanceReminder", reminderId));
	}

	private static MaintenanceReminderResponse toResponse(MaintenanceReminder reminder, LocalDate today,
			int vehicleMileage) {
		return new MaintenanceReminderResponse(reminder.getId(), reminder.getVehicleId(), reminder.getServiceId(),
				reminder.getTitle(), reminder.getDueDate(), reminder.getDueMileage(), reminder.getNote(),
				reminder.isDue(today, vehicleMileage), reminder.getDoneAt(), reminder.getNotifiedAt(),
				reminder.getCreatedAt());
	}

}
