
package org.coweb;

public class CowebException extends RuntimeException {

	private String topic;

	public CowebException(String topic, String message) {
		super(message);
		this.topic = topic;
	}

	public String getMessage() {
		return "Topic: " + topic + ", " + super.getMessage();
	}

};

