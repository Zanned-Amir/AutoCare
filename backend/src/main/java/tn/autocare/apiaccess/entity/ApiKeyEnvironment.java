package tn.autocare.apiaccess.entity;

public enum ApiKeyEnvironment {

	LIVE, TEST;

	public String prefix() {
		return "ac_" + name().toLowerCase() + "_";
	}

}
