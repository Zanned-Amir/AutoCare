package tn.autocare.provider.entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

@Getter
@Entity
@Table(schema = "provider", name = "provider_services")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProviderService extends BaseEntity {

	public static final String DEFAULT_CURRENCY = "TND";

	/** Organization id from the organization module. */
	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	/** AutoService id from the catalog module. */
	@Column(name = "service_id", nullable = false)
	private Long serviceId;

	@Column(name = "at_home", nullable = false)
	private boolean atHome;

	@Column(name = "indicative_price", precision = 12, scale = 3)
	private BigDecimal indicativePrice;

	@Column(nullable = false, length = 3)
	private String currency;

	public static ProviderService offer(Long organizationId, Long serviceId, boolean atHome,
			BigDecimal indicativePrice) {
		ProviderService service = new ProviderService();
		service.organizationId = organizationId;
		service.serviceId = serviceId;
		service.currency = DEFAULT_CURRENCY;
		service.update(atHome, indicativePrice);
		return service;
	}

	public void update(boolean atHome, BigDecimal indicativePrice) {
		this.atHome = atHome;
		this.indicativePrice = indicativePrice;
	}

}
