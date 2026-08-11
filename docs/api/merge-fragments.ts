/**
 * Consolida os fragmentos por módulo (docs/api/fragments/*.json, cada um só
 * com "paths" + "components.schemas") num spec OpenAPI 3.0 único
 * (docs/api/openapi.json), pronto pra importar no Apidog.
 *
 * Reroda isto sempre que um fragmento for editado à mão ou regerado —
 * os fragmentos são a fonte da verdade, o openapi.json é gerado.
 *
 * Uso: bun run docs/api/merge-fragments.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FRAGMENTS_DIR = join(import.meta.dir, 'fragments');
const OUTPUT_PATH = join(import.meta.dir, 'openapi.json');

interface Fragment {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Normaliza padrões que os agentes escreveram e que são semanticamente
 * corretos mas inválidos pro OpenAPI 3.0 estrito (confirmado via `redocly
 * lint`): `type: "null"` só existe em JSON Schema 2020-12/OpenAPI 3.1, e
 * `nullable: true` ao lado de `allOf`/`$ref` exige um `type` irmão. Roda
 * recursivamente em paths + schemas antes de escrever o arquivo final.
 */
function sanitizeOpenApiTypes(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) sanitizeOpenApiTypes(item);
    return;
  }
  if (node === null || typeof node !== 'object') return;

  const obj = node as Record<string, unknown>;

  if (obj.type === 'null') {
    delete obj.type;
    delete obj.nullable;
  } else if (
    obj.nullable === true &&
    Array.isArray(obj.allOf) &&
    obj.type === undefined
  ) {
    obj.type = 'object';
  }

  for (const value of Object.values(obj)) sanitizeOpenApiTypes(value);
}

function main() {
  const files = readdirSync(FRAGMENTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const paths: Record<string, Record<string, unknown>> = {};
  const schemas: Record<string, unknown> = {};
  const tagsSeen = new Set<string>();
  let operationCount = 0;
  const pathCollisions: string[] = [];
  const schemaConflicts: string[] = [];

  for (const file of files) {
    const raw = readFileSync(join(FRAGMENTS_DIR, file), 'utf8');
    const fragment = JSON.parse(raw) as Fragment;

    for (const [path, operations] of Object.entries(fragment.paths ?? {})) {
      if (!paths[path]) paths[path] = {};
      for (const [method, operation] of Object.entries(
        operations as Record<string, unknown>
      )) {
        if (paths[path][method]) {
          pathCollisions.push(`${method.toUpperCase()} ${path} (em ${file})`);
        }
        paths[path][method] = operation;
        operationCount++;
        const tags = (operation as { tags?: string[] }).tags ?? [];
        for (const tag of tags) tagsSeen.add(tag);
      }
    }

    for (const [name, schema] of Object.entries(
      fragment.components?.schemas ?? {}
    )) {
      if (schemas[name] && !deepEqual(schemas[name], schema)) {
        schemaConflicts.push(`${name} (conflito ao processar ${file})`);
        continue;
      }
      schemas[name] = schema;
    }
  }

  if (pathCollisions.length > 0) {
    console.warn('Colisões de path+method entre fragmentos:');
    for (const c of pathCollisions) console.warn(`  - ${c}`);
  }
  if (schemaConflicts.length > 0) {
    console.warn(
      'Schemas com mesmo nome e conteúdo DIFERENTE entre fragmentos (mantido o primeiro encontrado):'
    );
    for (const c of schemaConflicts) console.warn(`  - ${c}`);
  }

  const openapi = {
    openapi: '3.0.3',
    info: {
      title: 'Marcelus API',
      description:
        'API do backend do Marcelus (organização financeira pessoal/compartilhada — app mobile, dashboard web e chatbot no WhatsApp sobre um único backend canal-agnóstico). Documentação gerada a partir do código-fonte real das rotas (schemas Zod + guards de autenticação), não de anotações manuais — reflete o comportamento real da API na data de geração.',
      version: '1.0.0',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Desenvolvimento local' },
    ],
    tags: [...tagsSeen].sort().map((name) => ({ name })),
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Access token obtido em POST /auth/login ou POST /auth/register. Use `bun run auth:login` (raiz do repo) pra gerar um token de teste automaticamente a partir de um usuário de seed/teste.',
        },
      },
      schemas,
    },
    paths,
  };

  sanitizeOpenApiTypes(openapi.paths);
  sanitizeOpenApiTypes(openapi.components.schemas);

  writeFileSync(OUTPUT_PATH, JSON.stringify(openapi, null, 2));

  console.log(
    `OK: ${files.length} fragmentos, ${operationCount} operations, ${Object.keys(schemas).length} schemas, ${tagsSeen.size} tags.`
  );
  console.log(`Escrito em ${OUTPUT_PATH}`);
}

main();
