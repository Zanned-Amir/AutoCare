package tn.autocare.vehicle.service;



import org.springframework.core.io.Resource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tn.autocare.vehicle.dto.VehicleMakeDto;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Curated list of makes and models (src/main/resources/vehicle-catalog.json), loaded once at startup. */
@Service
public class VehicleCatalogService {

    private final List<VehicleMakeDto> makes;

    private final Map<String, VehicleMakeDto> makesByKey;

    public VehicleCatalogService(ObjectMapper mapper, @Value("classpath:vehicle-catalog.json") Resource resource)
            throws IOException {
        try (InputStream in = resource.getInputStream()) {
            this.makes = List.copyOf(mapper.readValue(in, new TypeReference<List<VehicleMakeDto>>() {
            }));
        }
        // Fails fast at startup if the file lists the same make twice.
        this.makesByKey = makes.stream().collect(Collectors.toUnmodifiableMap(m -> key(m.name()), Function.identity()));
    }

    public List<VehicleMakeDto> makes() {
        return makes;
    }

    /** "renault" -> "Renault"; unknown brands (free text) are only trimmed. */
    public String canonicalBrand(String brand) {
        return Optional.ofNullable(makesByKey.get(key(brand))).map(VehicleMakeDto::name).orElse(brand.trim());
    }

    /** "clio" -> "Clio" when the brand is in the catalog; unknown models are only trimmed. */
    public String canonicalModel(String brand, String model) {
        return Optional.ofNullable(makesByKey.get(key(brand)))
                .flatMap(make -> make.models().stream().filter(m -> key(m).equals(key(model))).findFirst())
                .orElse(model.trim());
    }

    /** Case, accent and surrounding-space insensitive ("Citroen " matches "Citroën"). */
    private static String key(String value) {
        return Normalizer.normalize(value.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }

}