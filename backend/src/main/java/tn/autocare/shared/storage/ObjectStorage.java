package tn.autocare.shared.storage;

import java.io.InputStream;
import java.net.URI;

/**
 * Object storage port (MinIO locally, S3 in production). Only the file module should call
 * it.
 */
public interface ObjectStorage {

	void putObject(String key, InputStream content, long sizeBytes, String contentType);

	void deleteObject(String key);

	URI createSignedGetUrl(String key);

}
