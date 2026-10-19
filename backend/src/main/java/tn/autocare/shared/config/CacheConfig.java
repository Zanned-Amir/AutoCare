package tn.autocare.shared.config;

import java.time.Duration;
import java.util.List;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.JacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;
import org.springframework.data.redis.serializer.RedisSerializer;

import tools.jackson.databind.JavaType;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;

/**
 * Redis cache. The default configuration stores single DTO records with type info. A
 * cache that holds a collection must register a typed configuration with {@link #listOf}
 * from its module (see catalog).
 */
@Configuration
@EnableCaching
public class CacheConfig {

	private static final Duration DEFAULT_TTL = Duration.ofMinutes(10);

	@Bean
	RedisCacheConfiguration redisCacheConfiguration() {
		// Only our own types may be named in cached JSON, so cache entries cannot
		// instantiate arbitrary classes.
		var typeValidator = BasicPolymorphicTypeValidator.builder()
			.allowIfSubType("tn.autocare.")
			.allowIfSubType("java.time.")
			.allowIfSubType("java.math.")
			.build();
		return base(DEFAULT_TTL,
				GenericJacksonJsonRedisSerializer.builder().enableDefaultTyping(typeValidator).build());
	}

	public static RedisCacheConfiguration listOf(Class<?> elementType, Duration ttl) {
		JavaType type = JsonMapper.shared().getTypeFactory().constructCollectionType(List.class, elementType);
		return base(ttl, new JacksonJsonRedisSerializer<>(type));
	}

	public static RedisCacheConfiguration valueOf(Class<?> valueType, Duration ttl) {
		return base(ttl, new JacksonJsonRedisSerializer<>(valueType));
	}

	private static RedisCacheConfiguration base(Duration ttl, RedisSerializer<?> serializer) {
		return RedisCacheConfiguration.defaultCacheConfig()
			.entryTtl(ttl)
			.prefixCacheNameWith("autocare:")
			.disableCachingNullValues()
			.serializeValuesWith(SerializationPair.fromSerializer(serializer));
	}

}
