package tn.autocare.organization.mapper;

import org.mapstruct.Mapper;

import tn.autocare.organization.api.OrganizationSummary;
import tn.autocare.organization.dto.OrganizationResponse;
import tn.autocare.organization.entity.Organization;

@Mapper
public interface OrganizationMapper {

	OrganizationResponse toResponse(Organization organization);

	OrganizationSummary toSummary(Organization organization);

}
