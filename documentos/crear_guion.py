from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path
out=Path(r'C:\dev_luis\protime\documentos\PROTIME_Guion_Pitch_IA.docx')
doc=Document()
sec=doc.sections[0]; sec.page_width=Inches(8.27); sec.page_height=Inches(11.69)
sec.top_margin=sec.bottom_margin=Inches(.72); sec.left_margin=sec.right_margin=Inches(.85)
for name in ['Normal','Title','Subtitle','Heading 1','Heading 2']:
 s=doc.styles[name]; s.font.name='Calibri'; s.font.color.rgb=RGBColor(0,0,0)
 s.paragraph_format.space_after=Pt(8)
doc.styles['Normal'].font.size=Pt(11)
doc.styles['Normal'].paragraph_format.line_spacing=1.13
doc.styles['Title'].font.size=Pt(25)
doc.styles['Heading 1'].font.size=Pt(15)
doc.styles['Heading 1'].paragraph_format.space_before=Pt(16)
doc.styles['Heading 1'].paragraph_format.keep_with_next=True
doc.styles['Heading 2'].font.size=Pt(12)
doc.add_paragraph('Guion del pitch de PROTIME con IA','Title')
doc.add_paragraph('Semilla Lab 2026','Subtitle')
doc.add_paragraph('Guion para explicar el flujo de prevención, presentar la demostración HTML y comunicar el uso eficiente de la IA. Las capacidades con IA se presentan como una evolución propuesta que se validará en el piloto.')
doc.add_paragraph('Mientras se muestra el diagrama','Heading 1')
p=doc.add_paragraph('Duración orientativa de lectura: 75 a 90 segundos. Ajustar con un ensayo en voz alta.');p.runs[0].italic=True;p.runs[0].font.size=Pt(10)
script=[
'Cada incidencia deja una experiencia, pero su valor está en aprovecharla para la siguiente decisión.',
'Con PROTIME proponemos conectar lo que ocurrió, lo que se hizo y lo que funcionó. La IA analiza los antecedentes relevantes y la información del próximo turno para señalar riesgos y recomendar acciones preventivas basadas en casos anteriores.',
'El supervisor revisa la propuesta, confirma al responsable y la fecha de solución. Al aprobar, PROTIME notifica por correo, recuerda los compromisos y escala los vencimientos.',
'Además, planteamos usar la IA cuando aporta valor: las reglas filtran los casos y solo se consultan los antecedentes necesarios. Los correos, recordatorios y alertas se ejecutan mediante la automatización de PROTIME. Así buscamos reducir consultas innecesarias y controlar el consumo.',
'Finalmente, verificamos si la acción funcionó. Ese resultado se incorpora al historial y sirve de antecedente para las siguientes recomendaciones.'
]
for t in script:doc.add_paragraph(t)
doc.add_paragraph('Transición a la demostración HTML','Heading 1')
doc.add_paragraph('Veamos cómo se traduce esto en una decisión concreta para la parcela 61.')
doc.add_paragraph('Cierre después de la demostración','Heading 1')
p=doc.add_paragraph('El valor de PROTIME es convertir la experiencia del campo en acciones preventivas y comprobar su resultado.');p.runs[0].bold=True

doc.add_page_break()
doc.add_paragraph('Frases para acompañar cada etapa','Heading 1')
for lead,text in [
('Anticipa','¿Dónde debemos actuar antes del próximo turno?'),
('Recomienda','¿Qué hicimos antes y qué resultado tuvo?'),
('Coordina','¿Quién lo hará, para cuándo y cómo damos seguimiento?'),
('Verifica','¿Funcionó y qué experiencia dejamos para la próxima decisión?')]:
 p=doc.add_paragraph();p.add_run(lead+'. ').bold=True;p.add_run(text)
doc.add_paragraph('Frase para remarcar con una pausa','Heading 1')
p=doc.add_paragraph('La IA propone. Las personas deciden. PROTIME coordina y verifica.');p.runs[0].bold=True

doc.add_paragraph('Cómo explicar la eficiencia de la IA','Heading 1')
doc.add_paragraph('Para el pitch, es más claro hablar de uso eficiente y control del costo que de tokens. El beneficio depende de implementar filtros y consultas selectivas; no se produce automáticamente por dibujar este flujo.')
p=doc.add_paragraph();p.add_run('Versión breve para decir en voz alta. ').bold=True;p.add_run('Usamos la IA cuando aporta valor. PROTIME filtra los casos y automatiza el seguimiento para evitar consultas innecesarias y controlar el costo operativo.')
p=doc.add_paragraph();p.add_run('Si el jurado pregunta por los tokens. ').bold=True;p.add_run('Los tokens son unidades de texto que procesa el modelo. Proponemos enviar solo la información relevante y reutilizar propuestas cuando el contexto no haya cambiado. La programación convencional ejecuta notificaciones, fechas y alertas sin consultar al modelo en cada paso. Esto puede reducir el consumo frente a delegar todo el flujo a la IA.')
doc.add_paragraph('Cómo sustentar el ahorro en el piloto','Heading 1')
doc.add_paragraph('Mediremos las llamadas al modelo, los tokens de entrada y salida y el costo por propuesta útil, manteniendo criterios de calidad. El ahorro se comparará con un flujo equivalente y con el mismo volumen de casos. Hasta tener esas mediciones, presentaremos una estrategia de eficiencia, sin afirmar porcentajes de ahorro.')
doc.add_paragraph('Nota para la presentación','Heading 1')
doc.add_paragraph('La demostración HTML utiliza datos y correos simulados. El historial debe registrar resultados evaluados; una mejora observada no garantiza que la misma acción funcione siempre ni implica que el modelo se reentrene automáticamente.')
p=doc.add_paragraph('Referencia técnica: OpenAI, Cost optimization. Recomienda reducir solicitudes y minimizar tokens para optimizar costos.');p.runs[0].font.size=Pt(9)
p=doc.add_paragraph('https://developers.openai.com/api/docs/guides/cost-optimization');p.runs[0].font.size=Pt(9)
doc.core_properties.title='Guion del pitch de PROTIME con IA'
doc.core_properties.subject='Presentación del flujo y uso eficiente de la inteligencia artificial'
doc.core_properties.author='PROTIME'
doc.save(out)
print(out)
