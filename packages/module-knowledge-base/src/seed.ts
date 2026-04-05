import { getDb } from '@oven/module-registry/db';
import { permissions } from '@oven/module-roles/schema';
import { tenants } from '@oven/module-tenants/schema';
import { kbKnowledgeBases, kbCategories, kbEntries, kbEntryVersions } from './schema';
import { sql, eq } from 'drizzle-orm';

// ─── Seed Function ──────────────────────────────────────────

export async function seedKnowledgeBase(db: ReturnType<typeof getDb>) {
  console.log('[module-knowledge-base] Starting seed...');

  // ─── 1. Permissions (idempotent via onConflictDoNothing) ──
  const modulePermissions = [
    { resource: 'kb-categories', action: 'read', slug: 'kb-categories.read', description: 'View KB categories' },
    { resource: 'kb-categories', action: 'create', slug: 'kb-categories.create', description: 'Create KB categories' },
    { resource: 'kb-categories', action: 'update', slug: 'kb-categories.update', description: 'Edit KB categories' },
    { resource: 'kb-categories', action: 'delete', slug: 'kb-categories.delete', description: 'Delete KB categories' },
    { resource: 'kb-entries', action: 'read', slug: 'kb-entries.read', description: 'View KB entries' },
    { resource: 'kb-entries', action: 'create', slug: 'kb-entries.create', description: 'Create KB entries' },
    { resource: 'kb-entries', action: 'update', slug: 'kb-entries.update', description: 'Edit KB entries' },
    { resource: 'kb-entries', action: 'delete', slug: 'kb-entries.delete', description: 'Delete KB entries' },
    { resource: 'kb-entries', action: 'ingest', slug: 'kb-entries.ingest', description: 'Bulk re-embed entries' },
  ];
  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // ─── 2. Vector column + HNSW index (idempotent via IF NOT EXISTS) ──
  try {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'kb_entries' AND column_name = 'embedding'
        ) THEN
          ALTER TABLE kb_entries ADD COLUMN embedding vector(1536);
        END IF;
      END $$;
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS kbe_embedding_hnsw_idx
      ON kb_entries USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    `);
  } catch (err) {
    console.warn('[KB Seed] Could not create vector column/index:', (err as Error).message);
  }

  // ─── 3. Public endpoint (idempotent via ON CONFLICT DO NOTHING) ──
  try {
    await db.execute(sql`
      INSERT INTO api_endpoint_permissions (module, route, method, is_public)
      VALUES ('knowledge-base', 'knowledge-base/[tenantSlug]/search', 'POST', true)
      ON CONFLICT DO NOTHING
    `);
  } catch { /* table may not exist */ }

  console.log('[module-knowledge-base] Seeded 9 permissions + vector column + HNSW index');

  // ─── 4. Resolve target tenant ─────────────────────────────
  const allTenants = await db.select().from(tenants).limit(1);
  if (allTenants.length === 0) {
    console.log('[module-knowledge-base] No tenants found, skipping content seed');
    return;
  }
  const targetTenantId = allTenants[0].id;
  console.log(`[module-knowledge-base] Seeding for tenant "${allTenants[0].name}" (id=${targetTenantId})`);

  // ─── 5. DELETE all existing KB data for this tenant (FK-safe order) ──
  // versions → entries → categories → knowledge bases
  await db.execute(sql`
    DELETE FROM kb_entry_versions WHERE entry_id IN (
      SELECT id FROM kb_entries WHERE tenant_id = ${targetTenantId}
    )
  `);
  await db.delete(kbEntries).where(eq(kbEntries.tenantId, targetTenantId));
  await db.delete(kbCategories).where(eq(kbCategories.tenantId, targetTenantId));
  await db.delete(kbKnowledgeBases).where(eq(kbKnowledgeBases.tenantId, targetTenantId));
  console.log('[module-knowledge-base] Cleared existing KB data');

  // ─── 6. Create default Knowledge Base ─────────────────────
  const [kb] = await db.insert(kbKnowledgeBases).values({
    tenantId: targetTenantId,
    name: 'Clínica Dental FAQ',
    slug: 'clinica-dental-faq',
    description: 'Preguntas frecuentes para clínica dental — agendamiento, horarios, servicios, pagos, urgencias',
    enabled: true,
  }).returning();
  const kbId = kb.id;
  console.log(`[module-knowledge-base] Created KB: "${kb.name}" (id=${kbId})`);

  // ─── 7. Seed 10 dental FAQ categories ─────────────────────
  const dentalCategories = [
    { name: 'Agendamiento', slug: 'agendamiento', description: 'Cómo agendar, cancelar, reagendar citas', icon: 'EventNote', order: 1 },
    { name: 'Horarios', slug: 'horarios', description: 'Horarios de atención, días festivos', icon: 'Schedule', order: 2 },
    { name: 'Ubicación', slug: 'ubicacion', description: 'Dirección, cómo llegar, parqueadero', icon: 'Place', order: 3 },
    { name: 'Servicios', slug: 'servicios', description: 'Servicios ofrecidos, tratamientos disponibles', icon: 'MedicalServices', order: 4 },
    { name: 'Pagos', slug: 'pagos', description: 'Métodos de pago, seguros, financiación', icon: 'Payment', order: 5 },
    { name: 'Antes de la cita', slug: 'antes-cita', description: 'Preparación para la cita, documentos necesarios', icon: 'Checklist', order: 6 },
    { name: 'Después de la cita', slug: 'despues-cita', description: 'Cuidados post-procedimiento', icon: 'Healing', order: 7 },
    { name: 'Síntomas / Dolor', slug: 'sintomas', description: 'Cuándo consultar, emergencias dentales', icon: 'LocalHospital', order: 8 },
    { name: 'Urgencias', slug: 'urgencias', description: 'Procedimiento de urgencias, contacto fuera de horario', icon: 'Emergency', order: 9 },
    { name: 'Atención humana', slug: 'atencion-humana', description: 'Cómo hablar con un humano, escalar consulta', icon: 'SupportAgent', order: 10 },
  ];

  for (const cat of dentalCategories) {
    await db.insert(kbCategories).values({
      tenantId: targetTenantId,
      knowledgeBaseId: kbId,
      ...cat,
      enabled: true,
    });
  }
  console.log('[module-knowledge-base] Seeded 10 categories');

  // ─── 8. Seed 15 sample FAQ entries ────────────────────────
  const allCats = await db.select().from(kbCategories).where(eq(kbCategories.knowledgeBaseId, kbId));
  const catBySlug = new Map(allCats.map((c) => [c.slug, c.id]));

  const sampleEntries: Array<{ slug: string; question: string; answer: string; keywords: string[]; priority: number }> = [
    { slug: 'agendamiento', question: '¿Cómo puedo agendar una cita?', answer: 'Puede agendar su cita de las siguientes formas:\n\n1. **Por teléfono**: Llame al (555) 123-4567 en horario de atención\n2. **Por WhatsApp**: Escriba al (555) 123-4568\n3. **En línea**: Visite nuestra web www.clinica-dental.com/citas\n4. **Presencial**: Acérquese a recepción\n\nRecuerde tener a la mano su documento de identidad.', keywords: ['agendar', 'cita', 'reservar', 'turno', 'programar'], priority: 9 },
    { slug: 'agendamiento', question: '¿Puedo cancelar o reagendar mi cita?', answer: 'Sí, puede cancelar o reagendar con al menos 24 horas de anticipación sin costo.\n\n- Llame al (555) 123-4567\n- WhatsApp al (555) 123-4568\n\n**Importante**: Cancelaciones con menos de 24h pueden generar cargo del 50%.', keywords: ['cancelar', 'reagendar', 'cambiar', 'cita'], priority: 8 },
    { slug: 'horarios', question: '¿Cuál es el horario de atención?', answer: 'Nuestro horario:\n\n- **Lunes a Viernes**: 8:00 AM - 6:00 PM\n- **Sábados**: 9:00 AM - 1:00 PM\n- **Domingos y festivos**: Cerrado\n\nÚltima cita 1 hora antes del cierre.', keywords: ['horario', 'hora', 'atención', 'abierto', 'cerrado'], priority: 10 },
    { slug: 'horarios', question: '¿Atienden los días festivos?', answer: 'No, los festivos nacionales permanecemos cerrados. Línea de emergencias 24/7: (555) 999-0000.', keywords: ['festivo', 'feriado', 'cerrado'], priority: 7 },
    { slug: 'ubicacion', question: '¿Dónde están ubicados?', answer: '**Dirección**: Calle 100 #15-20, Consultorio 301, Edificio Centro Médico Norte\n**Ciudad**: Bogotá, Colombia\n\nTransMilenio: Estación Calle 100. Parqueadero disponible ($5.000/hora).', keywords: ['dirección', 'ubicación', 'llegar', 'mapa', 'dónde'], priority: 9 },
    { slug: 'servicios', question: '¿Qué tratamientos ofrecen?', answer: 'Odontología General, Ortodoncia, Implantes, Estética dental, Cirugía oral, Endodoncia, Odontopediatría.\n\nAgende una valoración gratuita.', keywords: ['tratamiento', 'servicio', 'limpieza', 'ortodoncia', 'implantes'], priority: 8 },
    { slug: 'servicios', question: '¿Realizan ortodoncia invisible?', answer: 'Sí, ofrecemos Invisalign y otras marcas. Desde $3.500.000. Incluye valoración digital 3D y todos los alineadores.', keywords: ['invisalign', 'ortodoncia', 'invisible', 'alineadores'], priority: 7 },
    { slug: 'pagos', question: '¿Qué métodos de pago aceptan?', answer: 'Efectivo, tarjetas débito/crédito (Visa, Mastercard, Amex), transferencia bancaria, Nequi, Daviplata.\n\nFinanciación hasta 12 cuotas sin interés en tratamientos >$1.000.000.', keywords: ['pago', 'tarjeta', 'efectivo', 'financiación', 'cuotas'], priority: 8 },
    { slug: 'pagos', question: '¿Aceptan seguro dental?', answer: 'Sí: Colsanitas, SaludTotal, Compensar, Colmédica, Suramericana.\n\nTraiga carné y documento de identidad. Algunos procedimientos estéticos pueden no estar cubiertos.', keywords: ['seguro', 'aseguradora', 'eps', 'cobertura'], priority: 7 },
    { slug: 'antes-cita', question: '¿Qué debo llevar a mi primera cita?', answer: 'Documento de identidad, carné de seguro, radiografías previas, lista de medicamentos, historia clínica anterior.\n\nLlegue 15 min antes para registro.', keywords: ['primera', 'cita', 'llevar', 'documentos'], priority: 8 },
    { slug: 'despues-cita', question: '¿Qué cuidados después de una extracción?', answer: 'Primeras 24h: muerda gasa 30-45 min, no escupa, hielo en mejilla, dieta blanda.\n\nDías siguientes: no fume 72h, enjuague con agua+sal, tome medicamentos recetados.\n\nAlarma: sangrado >2h, fiebre, dolor intenso → contáctenos.', keywords: ['extracción', 'cuidados', 'después', 'sangrado'], priority: 9 },
    { slug: 'sintomas', question: '¿Qué hago si tengo dolor de muela?', answer: 'Alivio: analgésico (ibuprofeno 400mg), frío en mejilla, enjuague agua+sal.\n\nUrgencia: dolor que no cede, hinchazón, fiebre, dolor al abrir boca → llame al (555) 123-4567.', keywords: ['dolor', 'muela', 'duele', 'analgésico'], priority: 9 },
    { slug: 'urgencias', question: '¿Qué hago en emergencia dental?', answer: '**Línea 24/7**: (555) 999-0000\n\nUrgencias: dolor intenso, traumatismo, sangrado, hinchazón, diente fracturado.\n\nMientras llega: calma, gasa en sangrado, diente caído en leche, frío, NO aspirina.', keywords: ['urgencia', 'emergencia', 'accidente', 'sangrado'], priority: 10 },
    { slug: 'urgencias', question: '¿Se me cayó un diente, qué hago?', answer: 'Tiene 60 minutos:\n1. Recoja por la corona, NO la raíz\n2. Enjuague con leche (no jabón)\n3. Intente recolocar suavemente\n4. Si no puede: guarde en leche fría\n5. Llame (555) 999-0000 AHORA', keywords: ['diente', 'cayó', 'reimplantar', 'leche'], priority: 10 },
    { slug: 'atencion-humana', question: '¿Cómo puedo hablar con una persona?', answer: 'Escriba "agente" en este chat, llame al (555) 123-4567, WhatsApp (555) 123-4568, o email contacto@clinica-dental.com.\n\nL-V 8AM-6PM, Sáb 9AM-1PM. Respuesta promedio: 5 min.', keywords: ['humano', 'agente', 'persona', 'hablar', 'contacto'], priority: 10 },
  ];

  let entryCount = 0;
  for (const entry of sampleEntries) {
    const categoryId = catBySlug.get(entry.slug);
    if (!categoryId) continue;
    await db.insert(kbEntries).values({
      tenantId: targetTenantId,
      knowledgeBaseId: kbId,
      categoryId,
      question: entry.question,
      answer: entry.answer,
      keywords: entry.keywords,
      priority: entry.priority,
      language: 'es',
      enabled: true,
      version: 1,
      metadata: { embeddingStatus: 'pending' },
    });
    entryCount++;
  }

  console.log(`[module-knowledge-base] Seeded ${entryCount} entries`);
  console.log('[module-knowledge-base] Seed complete: 1 KB, 10 categories, 15 entries');
}
