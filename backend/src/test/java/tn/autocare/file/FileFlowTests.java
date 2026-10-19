package tn.autocare.file;

import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Arrays;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

import tn.autocare.TestcontainersConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Uploads through the owner modules (vehicle photos, avatar, organization logo and
 * documents).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class FileFlowTests {

	static final byte[] PNG = png();

	@Autowired
	MockMvc mvc;

	@Test
	void ownerUploadsListsAndDeletesVehiclePhotos() throws Exception {
		String owner = register();
		String vehicle = createVehicle(owner);
		String body = mvc
			.perform(multipart("/vehicles/" + vehicle + "/photos").file(image("clio.png", PNG))
				.header("Authorization", owner))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.contentType").value("image/png"))
			.andExpect(jsonPath("$.originalName").value("clio.png"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer fileId = JsonPath.read(body, "$.id");

		// The signed URL serves the bytes straight from MinIO.
		String url = JsonPath.read(body, "$.url");
		HttpResponse<byte[]> download = HttpClient.newHttpClient()
			.send(HttpRequest.newBuilder(URI.create(url)).build(), HttpResponse.BodyHandlers.ofByteArray());
		assertThat(download.statusCode()).isEqualTo(200);
		assertThat(download.body()).isEqualTo(PNG);

		mvc.perform(get("/vehicles/" + vehicle + "/photos").header("Authorization", owner))
			.andExpect(jsonPath("$.length()").value(1));
		mvc.perform(get("/vehicles/" + vehicle + "/photos").header("Authorization", register()))
			.andExpect(status().isNotFound());
		mvc.perform(delete("/vehicles/" + vehicle + "/photos/" + fileId).header("Authorization", owner))
			.andExpect(status().isNoContent());
		mvc.perform(get("/vehicles/" + vehicle + "/photos").header("Authorization", owner))
			.andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void refusesFilesThatAreNotWhatTheyClaim() throws Exception {
		String owner = register();
		String vehicle = createVehicle(owner);
		mvc.perform(multipart("/vehicles/" + vehicle + "/photos")
			.file(new MockMultipartFile("file", "virus.png", "image/png", "MZ fake executable".getBytes()))
			.header("Authorization", owner)).andExpect(jsonPath("$.code").value("FILE_TYPE_NOT_ALLOWED"));
		mvc.perform(multipart("/vehicles/" + vehicle + "/photos")
			.file(new MockMultipartFile("file", "carte.pdf", "application/pdf", "%PDF-1.7 test".getBytes()))
			.header("Authorization", owner)).andExpect(jsonPath("$.code").value("FILE_TYPE_NOT_ALLOWED"));
		for (int i = 0; i < 8; i++) {
			mvc.perform(multipart("/vehicles/" + vehicle + "/photos").file(image("p" + i + ".png", PNG))
				.header("Authorization", owner)).andExpect(status().isCreated());
		}
		mvc.perform(
				multipart("/vehicles/" + vehicle + "/photos").file(image("p9.png", PNG)).header("Authorization", owner))
			.andExpect(jsonPath("$.code").value("FILE_LIMIT_REACHED"));
	}

	@Test
	void avatarIsReplacedNotAdded() throws Exception {
		String user = register();
		mvc.perform(get("/me/avatar").header("Authorization", user)).andExpect(status().isNoContent());
		for (int i = 0; i < 2; i++) {
			mvc.perform(
					multipart(HttpMethod.PUT, "/me/avatar").file(image("me.png", PNG)).header("Authorization", user))
				.andExpect(status().isOk());
		}
		mvc.perform(get("/me/avatar").header("Authorization", user)).andExpect(jsonPath("$.purpose").value("AVATAR"));
		mvc.perform(delete("/me/avatar").header("Authorization", user)).andExpect(status().isNoContent());
		mvc.perform(get("/me/avatar").header("Authorization", user)).andExpect(status().isNoContent());
	}

	@Test
	void organizationDocumentsAreVisibleToTheAdminForApproval() throws Exception {
		String owner = register();
		String org = mvc.perform(post("/organizations").header("Authorization", owner)
			.contentType(MediaType.APPLICATION_JSON)
			.content(
					"{\"name\":\"Garage Docs\",\"type\":\"PROVIDER\",\"phone\":\"71000000\",\"governorate\":\"Tunis\",\"city\":\"Bardo\"}"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer orgId = JsonPath.read(org, "$.organization.id");
		mvc.perform(multipart("/organizations/" + orgId + "/documents")
			.file(new MockMultipartFile("file", "patente.pdf", "application/pdf", "%PDF-1.7 patente".getBytes()))
			.header("Authorization", owner)).andExpect(status().isCreated());
		mvc.perform(multipart(HttpMethod.PUT, "/organizations/" + orgId + "/logo").file(image("logo.png", PNG))
			.header("Authorization", owner)).andExpect(status().isOk());
		mvc.perform(get("/organizations/" + orgId + "/documents").header("Authorization", register()))
			.andExpect(status().isForbidden());

		String admin = login("admin@autocare.tn", "Admin@123456");
		mvc.perform(get("/admin/organizations/" + orgId + "/documents").header("Authorization", admin))
			.andExpect(jsonPath("$[0].contentType").value("application/pdf"));
		mvc.perform(post("/admin/organizations/" + orgId + "/approve").header("Authorization", admin))
			.andExpect(status().isOk());
	}

	@Test
	void organizationPhotosShowOnThePublicProfileAndAdminsCanManageFiles() throws Exception {
		String owner = register();
		String org = mvc.perform(post("/organizations").header("Authorization", owner)
			.contentType(MediaType.APPLICATION_JSON)
			.content(
					"{\"name\":\"Garage Photos\",\"type\":\"PROVIDER\",\"phone\":\"71000000\",\"governorate\":\"Tunis\",\"city\":\"Bardo\"}"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer orgId = JsonPath.read(org, "$.organization.id");
		mvc.perform(multipart("/organizations/" + orgId + "/photos").file(image("atelier.png", PNG))
			.header("Authorization", owner)).andExpect(status().isCreated());
		mvc.perform(multipart("/organizations/" + orgId + "/photos").file(image("atelier.png", PNG))
			.header("Authorization", register())).andExpect(status().isForbidden());

		String admin = login("admin@autocare.tn", "Admin@123456");
		String added = mvc
			.perform(multipart("/admin/organizations/" + orgId + "/photos").file(image("facade.png", PNG))
				.header("Authorization", admin))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer photoId = JsonPath.read(added, "$.id");
		mvc.perform(multipart(HttpMethod.PUT, "/admin/organizations/" + orgId + "/logo").file(image("logo.png", PNG))
			.header("Authorization", admin)).andExpect(status().isOk());
		mvc.perform(multipart("/admin/organizations/" + orgId + "/documents")
			.file(new MockMultipartFile("file", "rne.pdf", "application/pdf", "%PDF-1.7 rne".getBytes()))
			.header("Authorization", admin)).andExpect(status().isCreated());
		mvc.perform(get("/organizations/" + orgId + "/photos").header("Authorization", owner))
			.andExpect(jsonPath("$.length()").value(2));
		// Search only lists providers that offer at least one service.
		Integer serviceId = JsonPath
			.read(mvc.perform(get("/catalog/services")).andReturn().getResponse().getContentAsString(), "$[0].id");
		mvc.perform(post("/organizations/" + orgId + "/services").header("Authorization", owner)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"serviceId\":" + serviceId + ",\"atHome\":false}")).andExpect(status().isCreated());

		mvc.perform(post("/admin/organizations/" + orgId + "/approve").header("Authorization", admin))
			.andExpect(status().isOk());
		await().atMost(Duration.ofSeconds(10))
			.untilAsserted(() -> mvc.perform(get("/providers/" + orgId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.photoUrls.length()").value(2))
				.andExpect(jsonPath("$.logoUrl").exists()));
		await().atMost(Duration.ofSeconds(10))
			.untilAsserted(() -> mvc.perform(get("/providers?q=photos"))
				.andExpect(jsonPath("$.content[0].photoUrls.length()").value(1)));

		mvc.perform(delete("/admin/organizations/" + orgId + "/photos/" + photoId).header("Authorization", admin))
			.andExpect(status().isNoContent());
		mvc.perform(get("/admin/organizations/" + orgId + "/photos").header("Authorization", admin))
			.andExpect(jsonPath("$.length()").value(1));
	}

	private static MockMultipartFile image(String name, byte[] bytes) {
		return new MockMultipartFile("file", name, "image/png", bytes);
	}

	private static byte[] png() {
		byte[] bytes = Arrays.copyOf(new byte[] { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A }, 64);
		Arrays.fill(bytes, 8, 64, (byte) 7);
		return bytes;
	}

	private String createVehicle(String token) throws Exception {
		String body = mvc.perform(post("/vehicles").header("Authorization", token)
			.contentType(MediaType.APPLICATION_JSON)
			.content(
					"{\"brand\":\"Renault\",\"model\":\"Clio\",\"year\":2019,\"fuelType\":\"DIESEL\",\"mileage\":84500}"))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return String.valueOf((Integer) JsonPath.read(body, "$.id"));
	}

	private String register() throws Exception {
		String body = mvc
			.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + UUID.randomUUID()
						+ "@example.com\",\"password\":\"Secret@1234\",\"fullName\":\"Client Fichier\"}"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

	private String login(String email, String password) throws Exception {
		String body = mvc
			.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"scope\":\"backoffice\"}"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

}
