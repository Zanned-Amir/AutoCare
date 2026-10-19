package tn.autocare.diagnostic.dto;

import java.util.List;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tn.autocare.diagnostic.entity.AnswerType;

public record SaveQuestionRequest(@NotBlank @Size(max = 300) String text, @NotNull AnswerType answerType,
		@NotNull @Size(max = 10) List<@NotBlank @Size(max = 120) String> options, @NotNull @Min(0) Integer position) {
}
