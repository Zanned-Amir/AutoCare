package tn.autocare.file.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;

import tn.autocare.file.api.FilePurpose;

/**
 * Detects the real type from the first bytes, so a renamed .exe is never stored as an
 * image. The Content-Type sent by the browser is ignored.
 */
final class FileTypes {

	static final long MAX_IMAGE_BYTES = 5L * 1024 * 1024;

	static final long MAX_DOCUMENT_BYTES = 10L * 1024 * 1024;

	record Detected(String contentType, String extension) {

		boolean isImage() {
			return contentType.startsWith("image/");
		}

	}

	private static final Detected JPEG = new Detected("image/jpeg", "jpg");

	private static final Detected PNG = new Detected("image/png", "png");

	private static final Detected WEBP = new Detected("image/webp", "webp");

	private static final Detected PDF = new Detected("application/pdf", "pdf");

	private FileTypes() {
	}

	/** Reads the header without consuming it: the stream must support mark/reset. */
	static Optional<Detected> detect(InputStream in) throws IOException {
		in.mark(16);
		byte[] head = in.readNBytes(12);
		in.reset();
		if (startsWith(head, 0xFF, 0xD8, 0xFF)) {
			return Optional.of(JPEG);
		}
		if (startsWith(head, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
			return Optional.of(PNG);
		}
		if (startsWith(head, 'R', 'I', 'F', 'F') && head.length >= 12
				&& Arrays.equals(Arrays.copyOfRange(head, 8, 12), new byte[] { 'W', 'E', 'B', 'P' })) {
			return Optional.of(WEBP);
		}
		if (startsWith(head, '%', 'P', 'D', 'F')) {
			return Optional.of(PDF);
		}
		return Optional.empty();
	}

	static boolean isAllowed(FilePurpose purpose, Detected type) {
		return purpose == FilePurpose.DOCUMENT || type.isImage();
	}

	static long maxBytes(Detected type) {
		return type.isImage() ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
	}

	/** Avatars and logos are single: a new upload replaces the old one. */
	static boolean isSingle(FilePurpose purpose) {
		return purpose == FilePurpose.AVATAR || purpose == FilePurpose.LOGO;
	}

	static int maxCount(FilePurpose purpose) {
		return switch (purpose) {
			case AVATAR, LOGO -> 1;
			case PHOTO -> 8;
			case DOCUMENT -> 10;
		};
	}

	static Set<String> acceptedTypes(FilePurpose purpose) {
		return purpose == FilePurpose.DOCUMENT ? Set.of("image/jpeg", "image/png", "image/webp", "application/pdf")
				: Set.of("image/jpeg", "image/png", "image/webp");
	}

	private static boolean startsWith(byte[] head, int... expected) {
		if (head.length < expected.length) {
			return false;
		}
		for (int i = 0; i < expected.length; i++) {
			if ((head[i] & 0xFF) != expected[i]) {
				return false;
			}
		}
		return true;
	}

}
