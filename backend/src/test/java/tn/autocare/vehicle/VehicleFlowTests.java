package tn.autocare.vehicle;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

import tn.autocare.TestcontainersConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class VehicleFlowTests {

	private static final String CLIO = """
			{"brand":"Renault","model":"Clio","year":2019,"fuelType":"DIESEL","engine":"1.5 dCi","mileage":84500}""";

	@Autowired
	MockMvc mvc;

	@Test
	void ownerManagesTheirVehicle() throws Exception {
		String token = registerUser();
		String created = mvc.perform(
				post("/vehicles").header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(CLIO))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.brand").value("Renault"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer id = JsonPath.read(created, "$.id");

		mvc.perform(get("/vehicles").header("Authorization", token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(1));

		mvc.perform(patch("/vehicles/" + id + "/mileage").header("Authorization", token)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"mileage\":90000}")).andExpect(status().isOk()).andExpect(jsonPath("$.mileage").value(90000));

		mvc.perform(put("/vehicles/" + id).header("Authorization", token)
			.contentType(MediaType.APPLICATION_JSON)
			.content(CLIO))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VEHICLE_MILEAGE_DECREASED"));

		mvc.perform(delete("/vehicles/" + id).header("Authorization", token)).andExpect(status().isNoContent());
		mvc.perform(get("/vehicles/" + id).header("Authorization", token)).andExpect(status().isNotFound());
	}

	@Test
	void catalogNamesAreNormalizedAndFreeTextIsKept() throws Exception {
		String token = registerUser();
		mvc.perform(get("/vehicles/catalog").header("Authorization", token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[?(@.name == 'Citroën')].models[0]").exists());

		mvc.perform(post("/vehicles").header("Authorization", token)
			.contentType(MediaType.APPLICATION_JSON)
			.content(
					"""
							{"brand":" citroen ","model":"c3 aircross","year":2021,"fuelType":"ESSENCE","engine":"","mileage":30000}"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.brand").value("Citroën"))
			.andExpect(jsonPath("$.model").value("C3 Aircross"));

		mvc.perform(post("/vehicles").header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content("""
				{"brand":" Lada ","model":" Niva ","year":2010,"fuelType":"ESSENCE","engine":"","mileage":150000}"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.brand").value("Lada"))
			.andExpect(jsonPath("$.model").value("Niva"));
	}

	@Test
	void anotherUserCannotSeeOrChangeTheVehicle() throws Exception {
		String owner = registerUser();
		String stranger = registerUser();
		String created = mvc.perform(
				post("/vehicles").header("Authorization", owner).contentType(MediaType.APPLICATION_JSON).content(CLIO))
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer id = JsonPath.read(created, "$.id");

		mvc.perform(get("/vehicles/" + id).header("Authorization", stranger)).andExpect(status().isNotFound());
		mvc.perform(delete("/vehicles/" + id).header("Authorization", stranger)).andExpect(status().isNotFound());
		mvc.perform(get("/vehicles").header("Authorization", stranger))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void validatesInput() throws Exception {
		String token = registerUser();
		mvc.perform(post("/vehicles").header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content("""
				{"brand":"","model":"Clio","year":1900,"fuelType":"DIESEL","mileage":-1}"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.brand").exists())
			.andExpect(jsonPath("$.errors.year").exists())
			.andExpect(jsonPath("$.errors.mileage").exists());
		mvc.perform(get("/vehicles")).andExpect(status().isUnauthorized());
	}

	@Test
	void storesPlateAndVinNormalized() throws Exception {
		String token = registerUser();
		mvc.perform(post("/vehicles").header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content("""
				{"brand":"Renault","model":"Clio","year":2019,"fuelType":"DIESEL","mileage":85000,
				 "plate":" 123 tu  4567 ","vin":"vf1rja00x12345678"}"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.plate").value("123 TU 4567"))
			.andExpect(jsonPath("$.vin").value("VF1RJA00X12345678"));
		mvc.perform(post("/vehicles").header("Authorization", token)
			.contentType(MediaType.APPLICATION_JSON)
			.content(
					"""
							{"brand":"Renault","model":"Clio","year":2019,"fuelType":"DIESEL","mileage":85000,"vin":"TOO-SHORT"}"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.errors.vin").exists());
	}

	private String registerUser() throws Exception {
		String email = UUID.randomUUID() + "@example.com";
		String body = mvc
			.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"Secret@1234\",\"fullName\":\"Test User\"}"))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

}
