package tn.autocare.diagnostic.entity;

import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

@Getter
@Entity
@Table(schema = "diagnostic", name = "questions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Question extends BaseEntity {

	@Column(name = "symptom_id", nullable = false)
	private Long symptomId;

	@Column(nullable = false, length = 300)
	private String text;

	@Enumerated(EnumType.STRING)
	@Column(name = "answer_type", nullable = false, length = 20)
	private AnswerType answerType;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false, columnDefinition = "jsonb")
	private List<String> options = new ArrayList<>();

	@Column(nullable = false)
	private int position;

	public static Question create(Long symptomId, String text, AnswerType answerType, List<String> options,
			int position) {
		Question question = new Question();
		question.symptomId = symptomId;
		question.updateDetails(text, answerType, options, position);
		return question;
	}

	/** Choices are kept only for choice questions. */
	public void updateDetails(String text, AnswerType answerType, List<String> options, int position) {
		this.text = text.trim();
		this.answerType = answerType;
		this.options = answerType == AnswerType.SINGLE_CHOICE || answerType == AnswerType.MULTIPLE_CHOICE
				? new ArrayList<>(options) : new ArrayList<>();
		this.position = position;
	}

}
