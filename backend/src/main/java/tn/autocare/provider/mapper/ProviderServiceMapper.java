package tn.autocare.provider.mapper;

import org.mapstruct.Mapper;

import tn.autocare.provider.api.ProviderServiceDto;
import tn.autocare.provider.entity.ProviderService;

@Mapper
public interface ProviderServiceMapper {

	ProviderServiceDto toDto(ProviderService providerService);

}
