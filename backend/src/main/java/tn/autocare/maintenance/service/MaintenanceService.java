package tn.autocare.maintenance.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.maintenance.dto.MaintenanceRecordResponse;
import tn.autocare.maintenance.dto.MaintenanceRecordResponse.OrganizationInfo;
import tn.autocare.maintenance.dto.MaintenanceRecordResponse.ServiceInfo;
import tn.autocare.maintenance.dto.SaveMaintenanceRecordRequest;
import tn.autocare.maintenance.dto.UpdateMaintenanceReportRequest;
import tn.autocare.maintenance.entity.MaintenanceRecord;
import tn.autocare.maintenance.entity.RecordSource;
import tn.autocare.maintenance.repository.MaintenanceRecordRepository;
import tn.autocare.organization.api.OrganizationFacade;
import tn.autocare.organization.api.OrganizationSummary;
import tn.autocare.servicerequest.api.ServiceRequestCompleted;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.vehicle.api.VehicleDto;
import tn.autocare.vehicle.api.VehicleFacade;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MaintenanceService {

	private static final ZoneId TUNIS = ZoneId.of("Africa/Tunis");

	private final MaintenanceRecordRepository recordRepository;

	private final VehicleFacade vehicleFacade;

	private final CatalogFacade catalogFacade;

	private final OrganizationFacade organizationFacade;

	public List<MaintenanceRecordResponse> listVehicleHistory(Long ownerId, Long vehicleId) {
		checkOwner(ownerId, vehicleId);
		return toResponses(recordRepository.findAllByVehicleIdOrderByDateDescIdDesc(vehicleId));
	}

	/** A manual entry with a higher reading also raises the vehicle mileage. */
	@Transactional
	public MaintenanceRecordResponse createManualRecord(Long ownerId, Long vehicleId,
			SaveMaintenanceRecordRequest request) {
		checkOwner(ownerId, vehicleId);
		check(request);
		MaintenanceRecord record = recordRepository.save(MaintenanceRecord.manual(vehicleId, ownerId, request.date(),
				request.mileage(), request.serviceId(), request.description(), request.result()));
		raiseMileage(vehicleId, request.mileage());
		return toResponses(List.of(record)).getFirst();
	}

	@Transactional
	public MaintenanceRecordResponse updateManualRecord(Long ownerId, Long vehicleId, Long recordId,
			SaveMaintenanceRecordRequest request) {
		checkOwner(ownerId, vehicleId);
		check(request);
		MaintenanceRecord record = findOnVehicle(vehicleId, recordId);
		record.updateManualEntry(request.date(), request.mileage(), request.serviceId(), request.description(),
				request.result());
		raiseMileage(vehicleId, request.mileage());
		return toResponses(List.of(record)).getFirst();
	}

	@Transactional
	public void deleteManualRecord(Long ownerId, Long vehicleId, Long recordId) {
		checkOwner(ownerId, vehicleId);
		MaintenanceRecord record = findOnVehicle(vehicleId, recordId);
		record.checkManual();
		recordRepository.delete(record);
	}

	public Page<MaintenanceRecordResponse> listOrganizationRecords(Long organizationId, Pageable pageable) {
		Page<MaintenanceRecord> page = recordRepository.findAllByOrganizationId(organizationId, pageable);
		return new PageImpl<>(toResponses(page.getContent()), page.getPageable(), page.getTotalElements());
	}

	@Transactional
	public MaintenanceRecordResponse updateMaintenanceReport(Long organizationId, Long recordId,
			UpdateMaintenanceReportRequest request) {
		MaintenanceRecord record = recordRepository.findByIdAndOrganizationId(recordId, organizationId)
			.orElseThrow(() -> AppException.notFound("MaintenanceRecord", recordId));
		record.updateReport(request.result(), request.recommendations());
		return toResponses(List.of(record)).getFirst();
	}

	/** Idempotent: the event registry may deliver the same event twice. */
	@Transactional
	public void recordCompletedServiceRequest(ServiceRequestCompleted event) {
		if (recordRepository.existsByServiceRequestId(event.serviceRequestId())) {
			return;
		}
		String description = catalogFacade.findAutoService(event.serviceId())
			.map(AutoServiceDto::name)
			.orElse("Intervention");
		recordRepository.save(MaintenanceRecord.fromServiceRequest(event.serviceRequestId(), event.vehicleId(),
				event.serviceId(), event.organizationId(), LocalDate.ofInstant(event.completedAt(), TUNIS),
				event.mileage(), description, event.result(), event.recommendations(), event.userId()));
	}

	@Transactional
	public void deleteVehicleHistory(Long vehicleId) {
		recordRepository.deleteAllByVehicleId(vehicleId);
	}

	List<MaintenanceRecordResponse> toResponses(List<MaintenanceRecord> records) {
		Map<Long, OrganizationSummary> organizations = records.stream()
			.map(MaintenanceRecord::getOrganizationId)
			.filter(Objects::nonNull)
			.distinct()
			.map(organizationFacade::findOrganization)
			.flatMap(Optional::stream)
			.collect(Collectors.toMap(OrganizationSummary::id, Function.identity()));
		return records.stream().map(record -> {
			ServiceInfo service = record.getServiceId() == null ? null : new ServiceInfo(record.getServiceId(),
					catalogFacade.findAutoService(record.getServiceId()).map(AutoServiceDto::name).orElse(null));
			OrganizationSummary org = organizations.get(record.getOrganizationId());
			return new MaintenanceRecordResponse(record.getId(), record.getVehicleId(), record.getDate(),
					record.getMileage(), record.getDescription(), record.getResult(), record.getRecommendations(),
					record.getSource(), record.getSource() == RecordSource.MANUAL, record.getServiceRequestId(),
					service, org == null ? null : new OrganizationInfo(org.id(), org.name()), record.getCreatedAt());
		}).toList();
	}

	private void check(SaveMaintenanceRecordRequest request) {
		if (request.date().isAfter(LocalDate.now(TUNIS))) {
			throw new AppException(ErrorCode.MAINTENANCE_DATE_INVALID, "Date in the future");
		}
		if (request.serviceId() != null && catalogFacade.findAutoService(request.serviceId()).isEmpty()) {
			throw AppException.notFound("AutoService", request.serviceId());
		}
	}

	private void raiseMileage(Long vehicleId, int mileage) {
		VehicleDto vehicle = vehicleFacade.getVehicle(vehicleId);
		if (mileage > vehicle.mileage()) {
			vehicleFacade.updateVehicleMileage(vehicleId, mileage);
		}
	}

	private void checkOwner(Long ownerId, Long vehicleId) {
		if (!vehicleFacade.isVehicleOwnedBy(vehicleId, ownerId)) {
			throw AppException.notFound("Vehicle", vehicleId);
		}
	}

	private MaintenanceRecord findOnVehicle(Long vehicleId, Long recordId) {
		return recordRepository.findByIdAndVehicleId(recordId, vehicleId)
			.orElseThrow(() -> AppException.notFound("MaintenanceRecord", recordId));
	}

}
