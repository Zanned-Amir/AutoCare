package tn.autocare.vehicle.mapper;

import org.mapstruct.Mapper;

import tn.autocare.vehicle.api.VehicleDto;
import tn.autocare.vehicle.entity.Vehicle;

@Mapper
public interface VehicleMapper {

	VehicleDto toDto(Vehicle vehicle);

}
