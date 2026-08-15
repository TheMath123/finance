import type { Lang } from '../../params/lang';

export interface LegalSection {
	heading: string;
	paragraphs: string[];
}

export interface LegalPage {
	title: string;
	updatedAt: string;
	intro: string;
	sections: LegalSection[];
}

/**
 * Conteúdo de Privacidade/Termos — rascunho baseado nos dados e integrações
 * reais do produto (Stripe, Meta/WhatsApp Cloud API, OpenRouter para o
 * assistente de IA, login Google, Microsoft Clarity para analytics).
 * Deliberadamente NÃO cita provedor de nuvem, banco de dados, framework ou
 * algoritmo específico — só processadores de dado que o titular precisa
 * saber que existem (isso é exigência de transparência da LGPD, não
 * vazamento de infraestrutura).
 *
 * NÃO É ACONSELHAMENTO JURÍDICO — precisa de revisão por um advogado
 * inscrito na OAB antes de publicar de verdade, especialmente pelas
 * obrigações da LGPD (dado financeiro é dado sensível) e porque a cláusula
 * de foro (Termos, seção "Foro e legislação aplicável") usa um placeholder
 * de comarca que precisa ser preenchido com o endereço real da empresa.
 */
export const PRIVACY: Record<Lang, LegalPage> = {
	pt: {
		title: 'Política de Privacidade',
		updatedAt: 'Última atualização: 15 de agosto de 2026',
		intro:
			'Esta política explica quais dados o Marcelus coleta, por que coleta, com quem compartilha e quais direitos você tem sobre eles.',
		sections: [
			{
				heading: '1. Quais dados coletamos',
				paragraphs: [
					'Dados de cadastro: nome, e-mail, senha (armazenada com hash, nunca em texto puro) e, opcionalmente, número de WhatsApp.',
					'Dados financeiros que você registra: transações, contas, cartões, categorias, fórmulas personalizadas e comprovantes anexados.',
					'Importante: as informações de “contas” e “cartões” que você cadastra no Marcelus são apenas rótulos e valores definidos por você mesmo — nome do banco/cartão, limite, dia de fechamento e vencimento — usados só pra organizar seus lançamentos. O Marcelus nunca coleta, solicita ou armazena número de cartão de crédito/débito, código de segurança (CVV), data de validade, senha de acesso ao seu banco ou qualquer credencial bancária. Não há conexão automática com seu banco (Open Finance) nem processamento de pagamento com cartão dentro do produto.',
					'Dados de login social: se você entrar com o Google, recebemos nome, e-mail e foto de perfil da sua conta Google.',
					'Dados técnicos: endereço IP, tipo de dispositivo e navegador, usados por segurança (limite de tentativas de login, detecção de abuso).'
				]
			},
			{
				heading: '2. Por que usamos seus dados',
				paragraphs: [
					'Pra fornecer o serviço: guardar suas transações, calcular seus saldos e fórmulas, enviar notificações.',
					'Pra processar pagamentos de planos pagos, através do Stripe.',
					'Pra operar o assistente por WhatsApp, através da API oficial da Meta (WhatsApp Business Cloud API) e de modelos de IA acessados via OpenRouter.',
					'Pra melhorar o produto, através de métricas de uso agregadas (Microsoft Clarity).'
				]
			},
			{
				heading: '3. Base legal do tratamento (LGPD)',
				paragraphs: [
					'Execução de contrato: tratamos os dados necessários pra funcionar o serviço que você contratou — guardar transações, calcular saldos, processar sua assinatura.',
					'Consentimento: usado só onde a lei exige de forma específica, como a vinculação opcional do seu número de WhatsApp — você pode revogar a qualquer momento, sem afetar o restante do serviço.',
					'Interesse legítimo: usado pra dados técnicos de segurança (limite de tentativas de login, detecção de abuso), sempre de forma proporcional e o menos invasiva possível.',
					'Cumprimento de obrigação legal: quando formos exigidos a reter algum registro por determinação legal ou de autoridade competente.'
				]
			},
			{
				heading: '4. Com quem compartilhamos',
				paragraphs: [
					'Stripe (processamento de pagamento de assinaturas) — nunca temos acesso ao número completo do seu cartão.',
					'Meta (mensagens do WhatsApp) e provedores de IA via OpenRouter (respostas do assistente) — só quando você usa essas funções.',
					'Google (se você optar por entrar com sua conta Google).',
					'Provedores de infraestrutura (hospedagem e banco de dados) que processam os dados em nosso nome, sob contrato de confidencialidade e obrigações de proteção de dados equivalentes às desta política.',
					'Nunca vendemos seus dados pra terceiros.'
				]
			},
			{
				heading: '5. Retenção de dados',
				paragraphs: [
					'Mantemos seus dados enquanto sua conta estiver ativa. Se você excluir sua conta, removemos ou anonimizamos os dados associados, exceto o que formos legalmente obrigados a reter por prazo determinado.'
				]
			},
			{
				heading: '6. Seus direitos (LGPD)',
				paragraphs: [
					'Você pode, a qualquer momento: confirmar se tratamos seus dados, acessá-los, corrigi-los, solicitar anonimização/exclusão, portar seus dados e revogar consentimentos.',
					'Você pode excluir sua conta e todos os dados associados diretamente pelas configurações do app, a qualquer momento.'
				]
			},
			{
				heading: '7. Segurança',
				paragraphs: [
					'Todo tráfego é criptografado (HTTPS). Senhas são armazenadas com hash. Aplicamos limite de tentativas e bloqueio temporário contra ataques de força bruta.',
					'Apesar dessas medidas, nenhum sistema é totalmente imune a incidentes de segurança. Caso um incidente venha a afetar seus dados, agiremos com diligência pra conter o impacto e notificar você e a Autoridade Nacional de Proteção de Dados (ANPD), conforme exigido pela LGPD.'
				]
			},
			{
				heading: '8. Alterações desta política',
				paragraphs: [
					'Podemos atualizar esta política pra refletir mudanças no produto, na lei ou em nossas práticas. Mudanças relevantes serão avisadas no app ou por e-mail, com a data de atualização sempre visível no topo deste documento.'
				]
			},
			{
				heading: '9. Contato',
				paragraphs: [
					'Dúvidas sobre privacidade ou pra exercer seus direitos como titular de dados? Escreva pra contact@marcelus.app.'
				]
			}
		]
	},
	en: {
		title: 'Privacy Policy',
		updatedAt: 'Last updated: August 15, 2026',
		intro:
			'This policy explains what data Marcelus collects, why we collect it, who we share it with, and what rights you have over it.',
		sections: [
			{
				heading: '1. What data we collect',
				paragraphs: [
					'Account data: name, email, password (stored hashed, never in plain text) and, optionally, a WhatsApp number.',
					'Financial data you enter: transactions, accounts, cards, categories, custom formulas, and attached receipts.',
					'Important: the “accounts” and “cards” you register in Marcelus are just labels and values you define yourself — bank/card name, limit, closing and due dates — used only to organize your entries. Marcelus never collects, requests, or stores your credit/debit card number, security code (CVV), expiration date, your bank login password, or any banking credential. There is no automatic bank connection (Open Banking) and no in-app card payment processing.',
					'Social login data: if you sign in with Google, we receive your name, email, and profile picture from your Google account.',
					'Technical data: IP address, device and browser type, used for security (login rate limiting, abuse detection).'
				]
			},
			{
				heading: '2. Why we use your data',
				paragraphs: [
					'To provide the service: store your transactions, calculate balances and formulas, send notifications.',
					'To process payments for paid plans, through Stripe.',
					'To run the WhatsApp assistant, through Meta’s official WhatsApp Business Cloud API and AI models accessed via OpenRouter.',
					'To improve the product, through aggregated usage metrics (Microsoft Clarity).'
				]
			},
			{
				heading: '3. Legal basis for processing',
				paragraphs: [
					'Contract performance: we process the data needed to run the service you signed up for — storing transactions, calculating balances, processing your subscription.',
					'Consent: used only where specifically required, such as the optional linking of your WhatsApp number — you can revoke it at any time without affecting the rest of the service.',
					'Legitimate interest: used for technical security data (login rate limiting, abuse detection), always in a proportional, least-invasive way.',
					'Legal obligation: when we are required to retain a record by law or by a competent authority.'
				]
			},
			{
				heading: '4. Who we share data with',
				paragraphs: [
					'Stripe (subscription payment processing) — we never have access to your full card number.',
					'Meta (WhatsApp messages) and AI providers via OpenRouter (assistant responses) — only when you use those features.',
					'Google (if you choose to sign in with your Google account).',
					'Infrastructure providers (hosting and database) that process data on our behalf, under confidentiality agreements and data-protection obligations equivalent to this policy.',
					'We never sell your data to third parties.'
				]
			},
			{
				heading: '5. Data retention',
				paragraphs: [
					'We keep your data for as long as your account is active. If you delete your account, we remove or anonymize the associated data, except where we are legally required to retain it for a set period.'
				]
			},
			{
				heading: '6. Your rights',
				paragraphs: [
					'You can, at any time: confirm whether we process your data, access it, correct it, request anonymization/deletion, port your data, and revoke consent.',
					'You can delete your account and all associated data directly from the app settings, at any time.'
				]
			},
			{
				heading: '7. Security',
				paragraphs: [
					'All traffic is encrypted (HTTPS). Passwords are stored hashed. We apply rate limiting and temporary lockout against brute-force attacks.',
					'Despite these measures, no system is entirely immune to security incidents. Should an incident affect your data, we will act diligently to contain the impact and notify you and the relevant data protection authority as required by applicable law.'
				]
			},
			{
				heading: '8. Changes to this policy',
				paragraphs: [
					'We may update this policy to reflect changes to the product, the law, or our practices. Material changes will be announced in the app or by email, with the update date always shown at the top of this document.'
				]
			},
			{
				heading: '9. Contact',
				paragraphs: [
					'Questions about privacy, or want to exercise your data rights? Write to contact@marcelus.app.'
				]
			}
		]
	},
	es: {
		title: 'Política de Privacidad',
		updatedAt: 'Última actualización: 15 de agosto de 2026',
		intro:
			'Esta política explica qué datos recopila Marcelus, por qué los recopilamos, con quién los compartimos y qué derechos tienes sobre ellos.',
		sections: [
			{
				heading: '1. Qué datos recopilamos',
				paragraphs: [
					'Datos de registro: nombre, correo electrónico, contraseña (almacenada con hash, nunca en texto plano) y, opcionalmente, un número de WhatsApp.',
					'Datos financieros que registras: transacciones, cuentas, tarjetas, categorías, fórmulas personalizadas y comprobantes adjuntos.',
					'Importante: la información de “cuentas” y “tarjetas” que registras en Marcelus son solo etiquetas y valores que tú mismo defines — nombre del banco/tarjeta, límite, día de cierre y vencimiento — usados solo para organizar tus registros. Marcelus nunca recopila, solicita ni almacena el número de tu tarjeta de crédito/débito, código de seguridad (CVV), fecha de vencimiento, contraseña de acceso a tu banco, ni ninguna credencial bancaria. No hay conexión automática con tu banco (Open Banking) ni procesamiento de pagos con tarjeta dentro del producto.',
					'Datos de inicio de sesión social: si inicias sesión con Google, recibimos tu nombre, correo y foto de perfil de tu cuenta de Google.',
					'Datos técnicos: dirección IP, tipo de dispositivo y navegador, usados por seguridad (límite de intentos de inicio de sesión, detección de abuso).'
				]
			},
			{
				heading: '2. Por qué usamos tus datos',
				paragraphs: [
					'Para proveer el servicio: guardar tus transacciones, calcular saldos y fórmulas, enviar notificaciones.',
					'Para procesar pagos de planes pagos, mediante Stripe.',
					'Para operar el asistente por WhatsApp, mediante la API oficial de Meta (WhatsApp Business Cloud API) y modelos de IA accedidos vía OpenRouter.',
					'Para mejorar el producto, mediante métricas de uso agregadas (Microsoft Clarity).'
				]
			},
			{
				heading: '3. Base legal del tratamiento',
				paragraphs: [
					'Ejecución del contrato: tratamos los datos necesarios para operar el servicio que contrataste — guardar transacciones, calcular saldos, procesar tu suscripción.',
					'Consentimiento: usado solo donde la ley lo exige de forma específica, como la vinculación opcional de tu número de WhatsApp — puedes revocarlo en cualquier momento, sin afectar el resto del servicio.',
					'Interés legítimo: usado para datos técnicos de seguridad (límite de intentos de inicio de sesión, detección de abuso), siempre de forma proporcional y lo menos invasiva posible.',
					'Cumplimiento de obligación legal: cuando debamos retener algún registro por disposición legal o de autoridad competente.'
				]
			},
			{
				heading: '4. Con quién compartimos',
				paragraphs: [
					'Stripe (procesamiento de pago de suscripciones) — nunca tenemos acceso al número completo de tu tarjeta.',
					'Meta (mensajes de WhatsApp) y proveedores de IA vía OpenRouter (respuestas del asistente) — solo cuando usas esas funciones.',
					'Google (si eliges iniciar sesión con tu cuenta de Google).',
					'Proveedores de infraestructura (hosting y base de datos) que procesan datos en nuestro nombre, bajo acuerdos de confidencialidad y obligaciones de protección de datos equivalentes a esta política.',
					'Nunca vendemos tus datos a terceros.'
				]
			},
			{
				heading: '5. Retención de datos',
				paragraphs: [
					'Mantenemos tus datos mientras tu cuenta esté activa. Si eliminas tu cuenta, eliminamos o anonimizamos los datos asociados, excepto lo que estemos legalmente obligados a retener por un plazo determinado.'
				]
			},
			{
				heading: '6. Tus derechos',
				paragraphs: [
					'Puedes, en cualquier momento: confirmar si tratamos tus datos, acceder a ellos, corregirlos, solicitar anonimización/eliminación, portar tus datos y revocar consentimientos.',
					'Puedes eliminar tu cuenta y todos los datos asociados directamente desde la configuración de la app, en cualquier momento.'
				]
			},
			{
				heading: '7. Seguridad',
				paragraphs: [
					'Todo el tráfico está cifrado (HTTPS). Las contraseñas se almacenan con hash. Aplicamos límite de intentos y bloqueo temporal contra ataques de fuerza bruta.',
					'A pesar de estas medidas, ningún sistema es totalmente inmune a incidentes de seguridad. Si un incidente llega a afectar tus datos, actuaremos con diligencia para contener el impacto y notificarte a ti y a la autoridad de protección de datos competente, conforme lo exija la ley aplicable.'
				]
			},
			{
				heading: '8. Cambios a esta política',
				paragraphs: [
					'Podemos actualizar esta política para reflejar cambios en el producto, en la ley o en nuestras prácticas. Los cambios relevantes se avisarán en la app o por correo electrónico, con la fecha de actualización siempre visible en la parte superior de este documento.'
				]
			},
			{
				heading: '9. Contacto',
				paragraphs: [
					'¿Dudas sobre privacidad o quieres ejercer tus derechos como titular de datos? Escribe a contact@marcelus.app.'
				]
			}
		]
	}
};

export const TERMS: Record<Lang, LegalPage> = {
	pt: {
		title: 'Termos de Uso',
		updatedAt: 'Última atualização: 15 de agosto de 2026',
		intro: 'Ao criar uma conta no Marcelus, você concorda com estes termos.',
		sections: [
			{
				heading: '1. O que é o Marcelus',
				paragraphs: [
					'O Marcelus é uma ferramenta de organização financeira pessoal. Ele não é uma instituição financeira, não oferece consultoria de investimentos e não emite recomendações financeiras — os cálculos e projeções são só uma organização dos dados que você mesmo insere.'
				]
			},
			{
				heading: '2. Elegibilidade e cadastro',
				paragraphs: [
					'Pra usar o Marcelus, você precisa ter capacidade civil plena e fornecer informações verdadeiras, completas e atualizadas no cadastro. Sua conta é pessoal e intransferível — não pode ser compartilhada ou cedida a terceiros sem autorização nossa.'
				]
			},
			{
				heading: '3. Sua conta',
				paragraphs: [
					'Você é responsável por manter sua senha em sigilo e por tudo o que acontecer na sua conta. Avise a gente imediatamente se suspeitar de uso não autorizado.'
				]
			},
			{
				heading: '4. Planos e cobrança',
				paragraphs: [
					'Planos pagos são cobrados de forma recorrente, no intervalo escolhido, através do Stripe.',
					'Cancelamento não tem reembolso, exceto dentro dos primeiros 7 dias após a assinatura.',
					'Trials, quando oferecidos, viram cobrança automática ao final do período, salvo cancelamento antes disso.'
				]
			},
			{
				heading: '5. Uso aceitável',
				paragraphs: [
					'Não é permitido usar o serviço pra atividades ilegais, tentar acessar contas de terceiros, ou sobrecarregar deliberadamente nossa infraestrutura.'
				]
			},
			{
				heading: '6. Propriedade intelectual',
				paragraphs: [
					'A marca Marcelus, o layout, os textos, o código e a tecnologia por trás do serviço são de propriedade exclusiva da empresa que opera o Marcelus (ou de seus licenciantes) e protegidos por lei. Estes termos não concedem a você nenhuma licença sobre marca, código-fonte ou tecnologia, além do direito limitado, pessoal e revogável de usar o serviço conforme aqui descrito.'
				]
			},
			{
				heading: '7. Cancelamento, suspensão e exclusão',
				paragraphs: [
					'Você pode cancelar sua assinatura ou excluir sua conta a qualquer momento pelas configurações do app. A exclusão de conta é permanente.',
					'Podemos suspender ou encerrar sua conta, a nosso critério, em caso de violação destes termos, uso fraudulento ou por determinação legal, mediante aviso prévio sempre que possível.'
				]
			},
			{
				heading: '8. Limitação de responsabilidade',
				paragraphs: [
					'O Marcelus é fornecido "como está". Não nos responsabilizamos por decisões financeiras tomadas com base nos dados organizados no app — a responsabilidade pela exatidão dos lançamentos e pelas decisões é sua.',
					'Na máxima extensão permitida pela lei, não respondemos por danos indiretos, lucros cessantes, ou perda de dados decorrente de uso indevido da sua conta pelo próprio usuário ou por terceiros com acesso não autorizado por falha de sigilo do usuário. Nada nesta cláusula exclui direitos que a lei brasileira garanta a você como consumidor de forma irrenunciável.'
				]
			},
			{
				heading: '9. Alterações',
				paragraphs: [
					'Podemos atualizar estes termos; mudanças relevantes serão avisadas no app ou por e-mail, com a data de atualização sempre visível no topo deste documento.'
				]
			},
			{
				heading: '10. Foro e legislação aplicável',
				paragraphs: [
					'Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de [cidade/comarca a definir] para dirimir eventuais controvérsias decorrentes destes termos, resguardado o direito do consumidor de optar pelo foro de seu domicílio, conforme o Código de Defesa do Consumidor.'
				]
			},
			{
				heading: '11. Contato',
				paragraphs: ['Dúvidas sobre estes termos? Escreva pra contact@marcelus.app.']
			}
		]
	},
	en: {
		title: 'Terms of Service',
		updatedAt: 'Last updated: August 15, 2026',
		intro: 'By creating a Marcelus account, you agree to these terms.',
		sections: [
			{
				heading: '1. What Marcelus is',
				paragraphs: [
					'Marcelus is a personal finance organization tool. It is not a financial institution, does not offer investment advice, and does not issue financial recommendations — calculations and projections are just an organization of the data you enter yourself.'
				]
			},
			{
				heading: '2. Eligibility and registration',
				paragraphs: [
					'To use Marcelus, you must have full legal capacity and provide truthful, complete, and up-to-date information when registering. Your account is personal and non-transferable — it may not be shared or assigned to third parties without our authorization.'
				]
			},
			{
				heading: '3. Your account',
				paragraphs: [
					'You are responsible for keeping your password confidential and for everything that happens on your account. Let us know immediately if you suspect unauthorized use.'
				]
			},
			{
				heading: '4. Plans and billing',
				paragraphs: [
					'Paid plans are billed recurrently, at the chosen interval, through Stripe.',
					'Cancellations are non-refundable, except within the first 7 days after subscribing.',
					'Trials, when offered, turn into automatic billing at the end of the period unless canceled before then.'
				]
			},
			{
				heading: '5. Acceptable use',
				paragraphs: [
					'You may not use the service for illegal activities, attempt to access other users’ accounts, or deliberately overload our infrastructure.'
				]
			},
			{
				heading: '6. Intellectual property',
				paragraphs: [
					'The Marcelus brand, layout, text, code, and the technology behind the service are the exclusive property of the company operating Marcelus (or its licensors) and are protected by law. These terms grant you no license over the brand, source code, or technology, beyond the limited, personal, and revocable right to use the service as described here.'
				]
			},
			{
				heading: '7. Cancellation, suspension, and deletion',
				paragraphs: [
					'You can cancel your subscription or delete your account at any time from the app settings. Account deletion is permanent.',
					'We may suspend or terminate your account, at our discretion, in case of breach of these terms, fraudulent use, or as required by law, with prior notice whenever possible.'
				]
			},
			{
				heading: '8. Limitation of liability',
				paragraphs: [
					'Marcelus is provided "as is". We are not liable for financial decisions made based on the data organized in the app — responsibility for the accuracy of entries and for decisions is yours.',
					'To the maximum extent permitted by law, we are not liable for indirect damages, lost profits, or data loss resulting from misuse of your account by you or by third parties with unauthorized access due to a failure to keep your credentials confidential. Nothing in this clause excludes rights that applicable consumer law grants you on a non-waivable basis.'
				]
			},
			{
				heading: '9. Changes',
				paragraphs: [
					'We may update these terms; material changes will be announced in the app or by email, with the update date always shown at the top of this document.'
				]
			},
			{
				heading: '10. Governing law and venue',
				paragraphs: [
					'These terms are governed by the laws of the Federative Republic of Brazil. Any disputes arising from these terms shall be submitted to the courts of [city/venue to be defined], without prejudice to any non-waivable right you may have under applicable consumer law to choose the venue of your domicile.'
				]
			},
			{
				heading: '11. Contact',
				paragraphs: ['Questions about these terms? Write to contact@marcelus.app.']
			}
		]
	},
	es: {
		title: 'Términos de Servicio',
		updatedAt: 'Última actualización: 15 de agosto de 2026',
		intro: 'Al crear una cuenta en Marcelus, aceptas estos términos.',
		sections: [
			{
				heading: '1. Qué es Marcelus',
				paragraphs: [
					'Marcelus es una herramienta de organización financiera personal. No es una institución financiera, no ofrece asesoría de inversiones ni emite recomendaciones financieras — los cálculos y proyecciones son solo una organización de los datos que tú mismo ingresas.'
				]
			},
			{
				heading: '2. Elegibilidad y registro',
				paragraphs: [
					'Para usar Marcelus, debes tener plena capacidad civil y proporcionar información veraz, completa y actualizada al registrarte. Tu cuenta es personal e intransferible — no puede compartirse ni cederse a terceros sin nuestra autorización.'
				]
			},
			{
				heading: '3. Tu cuenta',
				paragraphs: [
					'Eres responsable de mantener tu contraseña en secreto y de todo lo que ocurra en tu cuenta. Avísanos de inmediato si sospechas de un uso no autorizado.'
				]
			},
			{
				heading: '4. Planes y facturación',
				paragraphs: [
					'Los planes pagos se cobran de forma recurrente, en el intervalo elegido, mediante Stripe.',
					'Las cancelaciones no tienen reembolso, excepto dentro de los primeros 7 días después de suscribirte.',
					'Las pruebas gratuitas, cuando se ofrecen, se convierten en cobro automático al final del período, salvo cancelación antes de eso.'
				]
			},
			{
				heading: '5. Uso aceptable',
				paragraphs: [
					'No está permitido usar el servicio para actividades ilegales, intentar acceder a cuentas de terceros, o sobrecargar deliberadamente nuestra infraestructura.'
				]
			},
			{
				heading: '6. Propiedad intelectual',
				paragraphs: [
					'La marca Marcelus, el diseño, los textos, el código y la tecnología detrás del servicio son propiedad exclusiva de la empresa que opera Marcelus (o de sus licenciantes) y están protegidos por ley. Estos términos no te otorgan ninguna licencia sobre la marca, el código fuente o la tecnología, más allá del derecho limitado, personal y revocable de usar el servicio según lo aquí descrito.'
				]
			},
			{
				heading: '7. Cancelación, suspensión y eliminación',
				paragraphs: [
					'Puedes cancelar tu suscripción o eliminar tu cuenta en cualquier momento desde la configuración de la app. La eliminación de cuenta es permanente.',
					'Podemos suspender o cancelar tu cuenta, a nuestra discreción, en caso de incumplimiento de estos términos, uso fraudulento o por disposición legal, con aviso previo siempre que sea posible.'
				]
			},
			{
				heading: '8. Limitación de responsabilidad',
				paragraphs: [
					'Marcelus se provee "tal cual". No somos responsables por decisiones financieras tomadas con base en los datos organizados en la app — la responsabilidad por la exactitud de los registros y por las decisiones es tuya.',
					'En la máxima medida permitida por la ley, no somos responsables por daños indirectos, lucro cesante, o pérdida de datos derivada del uso indebido de tu cuenta por ti mismo o por terceros con acceso no autorizado debido a una falla en mantener tus credenciales en secreto. Nada en esta cláusula excluye derechos que la ley de protección al consumidor aplicable te otorgue de forma irrenunciable.'
				]
			},
			{
				heading: '9. Cambios',
				paragraphs: [
					'Podemos actualizar estos términos; los cambios relevantes se avisarán en la app o por correo electrónico, con la fecha de actualización siempre visible en la parte superior de este documento.'
				]
			},
			{
				heading: '10. Ley aplicable y jurisdicción',
				paragraphs: [
					'Estos términos se rigen por las leyes de la República Federativa de Brasil. Cualquier controversia derivada de estos términos se someterá a los tribunales de [ciudad/fuero a definir], sin perjuicio de cualquier derecho irrenunciable que tengas bajo la ley de protección al consumidor aplicable de elegir el fuero de tu domicilio.'
				]
			},
			{
				heading: '11. Contacto',
				paragraphs: ['¿Dudas sobre estos términos? Escribe a contact@marcelus.app.']
			}
		]
	}
};
