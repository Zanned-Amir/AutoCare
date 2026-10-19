package tn.autocare.catalog.mapper;

import org.mapstruct.Mapper;

import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.entity.AutoService;

@Mapper
public interface AutoServiceMapper {

	AutoServiceDto toDto(AutoService autoService);

}
