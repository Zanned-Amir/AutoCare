package tn.autocare.diagnostic.config;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.diagnostic.entity.AnswerType;
import tn.autocare.diagnostic.entity.ConditionOperator;
import tn.autocare.diagnostic.entity.DiagnosticRule;
import tn.autocare.diagnostic.entity.DiagnosticUrgency;
import tn.autocare.diagnostic.entity.Question;
import tn.autocare.diagnostic.entity.RuleCondition;
import tn.autocare.diagnostic.entity.Symptom;
import tn.autocare.diagnostic.repository.DiagnosticRuleRepository;
import tn.autocare.diagnostic.repository.QuestionRepository;
import tn.autocare.diagnostic.repository.SymptomRepository;

/**
 * Starter rule set, inserted once into an empty database (every profile). Done in Java
 * rather than SQL so the suggested services are found through CatalogFacade instead of
 * reading the catalog schema.
 */
@Slf4j
@Component
@RequiredArgsConstructor
class DiagnosticSeeder implements ApplicationRunner {

	private record SeedCondition(int question, ConditionOperator operator, String value) {
	}

	private record SeedQuestion(String text, AnswerType type, List<String> options) {
	}

	private record SeedRule(int priority, String name, String cause, String recommendation, String service,
			DiagnosticUrgency urgency, List<SeedCondition> conditions) {
	}

	private record SeedSymptom(String label, String description, List<SeedQuestion> questions, List<SeedRule> rules) {
	}

	private static final List<SeedSymptom> SYMPTOMS = List.of(
			new SeedSymptom("Bruit au freinage", "Grincement, frottement ou pédale qui s'enfonce quand vous freinez.",
					List.of(new SeedQuestion(
							"Quel bruit entendez-vous en freinant ?", AnswerType.SINGLE_CHOICE,
							List.of("Grincement aigu", "Frottement métallique", "Claquement")),
							new SeedQuestion(
									"La pédale de frein est-elle molle ou s'enfonce-t-elle plus que d'habitude ?",
									AnswerType.YES_NO, List.of()),
							new SeedQuestion("La voiture tire-t-elle d'un côté quand vous freinez ?", AnswerType.YES_NO,
									List.of())),
					List.of(new SeedRule(30, "Pédale molle", "Fuite ou air dans le circuit de freinage",
							"Ne roulez pas : faites contrôler le circuit et le liquide de frein immédiatement.",
							"Freinage", DiagnosticUrgency.HIGH,
							List.of(new SeedCondition(1, ConditionOperator.EQUALS, "true"))),
							new SeedRule(20, "Frottement métallique",
									"Plaquettes usées jusqu'au métal, disques probablement abîmés",
									"Remplacez les plaquettes et faites vérifier les disques rapidement.", "Freinage",
									DiagnosticUrgency.HIGH,
									List.of(new SeedCondition(0, ConditionOperator.EQUALS, "Frottement métallique"))),
							new SeedRule(15, "Tire d'un côté", "Étrier grippé ou usure inégale des plaquettes",
									"Faites contrôler les étriers et l'usure des plaquettes.", "Freinage",
									DiagnosticUrgency.MEDIUM,
									List.of(new SeedCondition(2, ConditionOperator.EQUALS, "true"))),
							new SeedRule(10, "Grincement", "Plaquettes en fin de vie (témoin d'usure)",
									"Prévoyez le remplacement des plaquettes dans les prochains jours.", "Freinage",
									DiagnosticUrgency.MEDIUM,
									List.of(new SeedCondition(0, ConditionOperator.EQUALS, "Grincement aigu"))),
							new SeedRule(0, "Par défaut", "Usure du système de freinage",
									"Faites contrôler les freins par un professionnel.", "Freinage",
									DiagnosticUrgency.MEDIUM, List.of()))),
			new SeedSymptom("La voiture ne démarre pas",
					"Rien ne se passe, des clics, ou le moteur tourne sans démarrer.",
					List.of(new SeedQuestion("Que se passe-t-il quand vous tournez la clé ?", AnswerType.SINGLE_CHOICE,
							List.of("Rien du tout", "Clics rapides", "Le moteur tourne mais ne démarre pas")),
							new SeedQuestion("Les phares et le tableau de bord s'allument-ils normalement ?",
									AnswerType.YES_NO, List.of()),
							new SeedQuestion("Quel âge a la batterie (en années) ?", AnswerType.NUMBER, List.of())),
					List.of(new SeedRule(30, "Clics", "Batterie déchargée",
							"Faites tester la batterie : une recharge ou un remplacement est probable.", "Batterie",
							DiagnosticUrgency.MEDIUM,
							List.of(new SeedCondition(0, ConditionOperator.EQUALS, "Clics rapides"))),
							new SeedRule(25, "Pas de courant", "Batterie à plat ou cosse desserrée",
									"Vérifiez les cosses puis faites tester la batterie.", "Batterie",
									DiagnosticUrgency.MEDIUM,
									List.of(new SeedCondition(1, ConditionOperator.EQUALS, "false"))),
							new SeedRule(20, "Moteur tourne", "Problème d'alimentation en carburant ou d'allumage",
									"Faites réaliser un diagnostic électrique et carburant.", "Electricite",
									DiagnosticUrgency.MEDIUM,
									List.of(new SeedCondition(0, ConditionOperator.EQUALS,
											"Le moteur tourne mais ne démarre pas"))),
							new SeedRule(15, "Vieille batterie", "Batterie en fin de vie",
									"Au-delà de 5 ans, une batterie se remplace souvent : faites-la tester.",
									"Batterie", DiagnosticUrgency.LOW,
									List.of(new SeedCondition(2, ConditionOperator.AT_LEAST, "5"))),
							new SeedRule(0, "Par défaut", "Panne du circuit de démarrage (démarreur, contacteur)",
									"Faites contrôler le circuit de démarrage.", "Electricite",
									DiagnosticUrgency.MEDIUM, List.of()))),
			new SeedSymptom("Le moteur chauffe",
					"L'aiguille de température monte ou un voyant de température s'allume.",
					List.of(new SeedQuestion("L'aiguille de température monte-t-elle dans le rouge ?",
							AnswerType.YES_NO, List.of()),
							new SeedQuestion("Voyez-vous une fuite de liquide sous la voiture ?", AnswerType.YES_NO,
									List.of()),
							new SeedQuestion("Le niveau de liquide de refroidissement est-il bas ?", AnswerType.YES_NO,
									List.of())),
					List.of(new SeedRule(30, "Surchauffe et fuite",
							"Fuite du circuit de refroidissement (durite, radiateur)",
							"Arrêtez le moteur et faites remorquer si besoin : rouler en surchauffe abîme le moteur.",
							"Refroidissement", DiagnosticUrgency.HIGH,
							List.of(new SeedCondition(0, ConditionOperator.EQUALS, "true"),
									new SeedCondition(1, ConditionOperator.EQUALS, "true"))),
							new SeedRule(20, "Niveau bas", "Manque de liquide de refroidissement",
									"Complétez le niveau moteur froid et faites vérifier l'étanchéité.",
									"Refroidissement", DiagnosticUrgency.MEDIUM,
									List.of(new SeedCondition(2, ConditionOperator.EQUALS, "true"))),
							new SeedRule(10, "Surchauffe", "Thermostat ou pompe à eau défaillant",
									"Évitez de rouler et faites contrôler le thermostat et la pompe à eau.",
									"Refroidissement", DiagnosticUrgency.HIGH,
									List.of(new SeedCondition(0, ConditionOperator.EQUALS, "true"))),
							new SeedRule(0, "Par défaut", "Circuit de refroidissement à contrôler",
									"Faites vérifier le refroidissement lors du prochain entretien.", "Refroidissement",
									DiagnosticUrgency.MEDIUM, List.of()))),
			new SeedSymptom("La climatisation ne refroidit plus",
					"L'air reste tiède ou une mauvaise odeur sort des aérateurs.",
					List.of(new SeedQuestion("De l'air sort-il des aérateurs ?", AnswerType.YES_NO, List.of()),
							new SeedQuestion("Depuis combien d'années la climatisation n'a-t-elle pas été rechargée ?",
									AnswerType.NUMBER, List.of()),
							new SeedQuestion("Sentez-vous une mauvaise odeur ?", AnswerType.YES_NO, List.of())),
					List.of(new SeedRule(20, "Pas d'air", "Pulseur ou commande de ventilation en panne",
							"Faites contrôler le pulseur et sa commande.", "Electricite", DiagnosticUrgency.LOW,
							List.of(new SeedCondition(0, ConditionOperator.EQUALS, "false"))),
							new SeedRule(15, "Recharge ancienne", "Manque de gaz réfrigérant",
									"Faites recharger la climatisation et contrôler l'étanchéité.", "Climatisation",
									DiagnosticUrgency.LOW,
									List.of(new SeedCondition(1, ConditionOperator.AT_LEAST, "2"))),
							new SeedRule(10, "Odeur", "Filtre d'habitacle encrassé ou bactéries dans le circuit",
									"Remplacez le filtre d'habitacle et faites nettoyer le circuit.", "Climatisation",
									DiagnosticUrgency.LOW,
									List.of(new SeedCondition(2, ConditionOperator.EQUALS, "true"))),
							new SeedRule(0, "Par défaut", "Climatisation à contrôler",
									"Faites contrôler la climatisation.", "Climatisation", DiagnosticUrgency.LOW,
									List.of()))),
			new SeedSymptom("Vibrations ou bruits en roulant",
					"Le volant vibre, la voiture tape sur les bosses ou les pneus s'usent mal.",
					List.of(new SeedQuestion("Quand ressentez-vous les vibrations ?", AnswerType.SINGLE_CHOICE,
							List.of("À haute vitesse", "En passant sur des bosses", "Tout le temps")),
							new SeedQuestion("Les pneus sont-ils usés de façon inégale ?", AnswerType.YES_NO,
									List.of()),
							new SeedQuestion("Entendez-vous un bruit sourd sur les bosses ?", AnswerType.YES_NO,
									List.of())),
					List.of(new SeedRule(20, "Haute vitesse", "Roues mal équilibrées", "Faites équilibrer les roues.",
							"Pneumatiques", DiagnosticUrgency.LOW,
							List.of(new SeedCondition(0, ConditionOperator.EQUALS, "À haute vitesse"))),
							new SeedRule(20, "Bruit sur les bosses", "Amortisseurs ou silentblocs usés",
									"Faites contrôler les amortisseurs et les silentblocs.", "Suspension",
									DiagnosticUrgency.MEDIUM,
									List.of(new SeedCondition(2, ConditionOperator.EQUALS, "true"))),
							new SeedRule(15, "Usure inégale", "Géométrie (parallélisme) déréglée",
									"Faites contrôler le parallélisme et l'état des pneus.", "Pneumatiques",
									DiagnosticUrgency.MEDIUM,
									List.of(new SeedCondition(1, ConditionOperator.EQUALS, "true"))),
							new SeedRule(10, "Bosses", "Suspension fatiguée", "Faites contrôler la suspension.",
									"Suspension", DiagnosticUrgency.MEDIUM,
									List.of(new SeedCondition(0, ConditionOperator.EQUALS,
											"En passant sur des bosses"))),
							new SeedRule(0, "Par défaut", "Train roulant à contrôler",
									"Faites contrôler pneus, équilibrage et suspension.", "Suspension",
									DiagnosticUrgency.MEDIUM, List.of()))),
			new SeedSymptom("Voyant d'huile ou vidange en retard",
					"Le voyant d'huile s'allume ou la dernière vidange date.",
					List.of(new SeedQuestion("Le voyant d'huile est-il allumé ?", AnswerType.YES_NO, List.of()),
							new SeedQuestion("Combien de kilomètres depuis la dernière vidange ?", AnswerType.NUMBER,
									List.of())),
					List.of(new SeedRule(30, "Voyant allumé", "Pression ou niveau d'huile insuffisant",
							"Arrêtez-vous et vérifiez le niveau d'huile ; ne roulez pas si le voyant reste allumé.",
							"Vidange", DiagnosticUrgency.HIGH,
							List.of(new SeedCondition(0, ConditionOperator.EQUALS, "true"))),
							new SeedRule(20, "Vidange due", "Vidange à faire",
									"Programmez une vidange avec changement du filtre à huile.", "Vidange",
									DiagnosticUrgency.LOW,
									List.of(new SeedCondition(1, ConditionOperator.AT_LEAST, "10000"))),
							new SeedRule(0, "Par défaut", "Entretien à prévoir",
									"Vérifiez le niveau d'huile et suivez le carnet d'entretien.", "Vidange",
									DiagnosticUrgency.LOW, List.of()))));

	private final SymptomRepository symptomRepository;

	private final QuestionRepository questionRepository;

	private final DiagnosticRuleRepository ruleRepository;

	private final CatalogFacade catalogFacade;

	private final TransactionTemplate transactionTemplate;

	@Override
	public void run(ApplicationArguments args) {
		transactionTemplate.executeWithoutResult(status -> {
			if (symptomRepository.count() > 0) {
				return;
			}
			Map<String, Long> services = catalogFacade.listActiveAutoServices()
				.stream()
				.collect(Collectors.toMap(AutoServiceDto::name, AutoServiceDto::id));
			for (int s = 0; s < SYMPTOMS.size(); s++) {
				seedSymptom(SYMPTOMS.get(s), s, services);
			}
			log.info("Seeded {} diagnostic symptoms", SYMPTOMS.size());
		});
	}

	private void seedSymptom(SeedSymptom seed, int position, Map<String, Long> services) {
		Symptom symptom = symptomRepository.save(Symptom.create(seed.label(), seed.description(), position, true));
		List<Long> questionIds = new java.util.ArrayList<>();
		for (int q = 0; q < seed.questions().size(); q++) {
			SeedQuestion question = seed.questions().get(q);
			questionIds.add(questionRepository
				.save(Question.create(symptom.getId(), question.text(), question.type(), question.options(), q))
				.getId());
		}
		for (SeedRule rule : seed.rules()) {
			List<RuleCondition> conditions = rule.conditions()
				.stream()
				.map(c -> new RuleCondition(questionIds.get(c.question()), c.operator(), c.value()))
				.toList();
			ruleRepository.save(DiagnosticRule.create(symptom.getId(), rule.name(), conditions, rule.priority(),
					rule.cause(), rule.recommendation(), services.get(rule.service()), rule.urgency()));
		}
	}

}
