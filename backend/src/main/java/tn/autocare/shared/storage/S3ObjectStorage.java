package tn.autocare.shared.storage;

import java.io.InputStream;
import java.net.URI;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Slf4j
@Component
class S3ObjectStorage implements ObjectStorage {

	private final StorageProperties props;

	private final S3Client client;

	private final S3Presigner presigner;

	S3ObjectStorage(StorageProperties properties) {
		this.props = properties;
		var credentials = StaticCredentialsProvider
			.create(AwsBasicCredentials.create(props.accessKey(), props.secretKey()));
		var s3Config = S3Configuration.builder().pathStyleAccessEnabled(props.pathStyleAccess()).build();
		this.client = S3Client.builder()
			.endpointOverride(props.endpoint())
			.region(Region.of(props.region()))
			.credentialsProvider(credentials)
			.serviceConfiguration(s3Config)
			.build();
		this.presigner = S3Presigner.builder()
			.endpointOverride(props.signedUrlEndpoint())
			.region(Region.of(props.region()))
			.credentialsProvider(credentials)
			.serviceConfiguration(s3Config)
			.build();
	}

	// Dev convenience: create the bucket so a fresh MinIO works. Storage being down must
	// not stop the API.
	@EventListener(ApplicationReadyEvent.class)
	void ensureBucket() {
		try {
			client.headBucket(b -> b.bucket(props.bucket()));
		}
		catch (NoSuchBucketException ex) {
			client.createBucket(b -> b.bucket(props.bucket()));
			log.info("Created storage bucket {}", props.bucket());
		}
		catch (RuntimeException ex) {
			log.warn("Object storage not reachable at {}: {}", props.endpoint(), ex.getMessage());
		}
	}

	@Override
	public void putObject(String key, InputStream content, long sizeBytes, String contentType) {
		client.putObject(b -> b.bucket(props.bucket()).key(key).contentType(contentType),
				RequestBody.fromInputStream(content, sizeBytes));
	}

	@Override
	public void deleteObject(String key) {
		client.deleteObject(b -> b.bucket(props.bucket()).key(key));
	}

	@Override
	public URI createSignedGetUrl(String key) {
		var request = presigner.presignGetObject(p -> p.signatureDuration(props.signedUrlTtl())
			.getObjectRequest(g -> g.bucket(props.bucket()).key(key)));
		return URI.create(request.url().toString());
	}

}
