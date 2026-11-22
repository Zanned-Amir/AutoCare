/**
 * AI assistant. The answers come from the ai-service microservice (FastAPI): the chat goes
 * to it over HTTP and is streamed back as Server-Sent Events; vehicle and service request
 * events reach it through Kafka, and its maintenance suggestions come back the same way.
 * The module stores nothing, so it has no schema.
 */
@ApplicationModule(displayName = "Assistant")
package tn.autocare.assistant;

import org.springframework.modulith.ApplicationModule;
