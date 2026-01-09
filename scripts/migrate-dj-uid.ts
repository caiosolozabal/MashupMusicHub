/**
 * scripts/migrate-dj-uid.ts
 *
 * Migra referências de DJ antigo -> DJ novo em:
 * - events.dj_id
 * - settlements.djId
 *
 * NÃO ALTERA:
 * - events.created_by
 * - settlements.generatedBy
 */

import admin from "firebase-admin";

// Inicialize com as credenciais do seu projeto.
// Se estiver rodando em um ambiente Google (Cloud Run, Functions), isso é automático.
// Localmente, você precisa configurar as credenciais via variável de ambiente:
// export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-file.json"
admin.initializeApp();
const db = admin.firestore();

// ✅ Controle de segurança
const DRY_RUN = true; // troque para false quando validar

// UIDs antigos (origens)
const OLD_UIDS = [
  "PTvylxq1UHPYXqot3JmtzyW6TDq2",
  "EHF5NOE47IUzfC2ikacf5la54Ar2",
];

// UID novo (destino)
const NEW_UID = "YExOHwgE7DNFONwybcX5YL2fXcg1";

// Campos denormalizados
const STANDARD_DJ_NAME = "Solô";

type CollectionTarget = {
  name: string;
  uidField: string; // field that stores DJ UID
  extraUpdates?: Record<string, any>; // optional denormalized fields to standardize
};

const TARGETS: CollectionTarget[] = [
  {
    name: "events",
    uidField: "dj_id",
    extraUpdates: {
      dj_nome: STANDARD_DJ_NAME,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
  },
  {
    name: "settlements",
    uidField: "djId",
    extraUpdates: {
      djName: STANDARD_DJ_NAME,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  },
];

async function assertNewUserExists() {
  const userRef = db.collection("users").doc(NEW_UID);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new Error(
      `ERRO CRÍTICO: O usuário de destino /users/${NEW_UID} não existe. Crie o documento de usuário no Firestore antes de rodar a migração.`
    );
  }
  const data = snap.data() || {};
  console.log(`[OK] Usuário de destino encontrado: { uid: ${NEW_UID}, email: ${data.email}, role: ${data.role} }`);
}

async function countByUid(collection: string, field: string, uid: string) {
  const snap = await db.collection(collection).where(field, "in", OLD_UIDS).get();
  return snap.size;
}

async function dryRunReport() {
  console.log("\n=== RELATÓRIO DE IMPACTO (DRY RUN) ===");
  let totalEvents = 0;
  let totalSettlements = 0;

  for (const oldUid of OLD_UIDS) {
     const eventsCount = await db.collection("events").where("dj_id", "==", oldUid).get().then(s => s.size);
     if (eventsCount > 0) {
        console.log(`- Encontrados ${eventsCount} eventos com o UID antigo: ${oldUid}`);
        totalEvents += eventsCount;
     }
     const settlementsCount = await db.collection("settlements").where("djId", "==", oldUid).get().then(s => s.size);
     if(settlementsCount > 0) {
        console.log(`- Encontrados ${settlementsCount} fechamentos com o UID antigo: ${oldUid}`);
        totalSettlements += settlementsCount;
     }
  }
  console.log("-----------------------------------------");
  console.log(`Total de EVENTOS a serem migrados: ${totalEvents}`);
  console.log(`Total de FECHAMENTOS a serem migrados: ${totalSettlements}`);
  console.log("=========================================\n");
}


async function migrateCollection(target: CollectionTarget, oldUid: string) {
  const { name, uidField, extraUpdates } = target;

  console.log(`\n--- Migrando coleção [${name}] para o UID antigo [${oldUid}] ---`);
  const snapshot = await db.collection(name).where(uidField, "==", oldUid).get();
  
  if (snapshot.empty) {
    console.log(`Nenhum documento encontrado em [${name}] com o UID [${oldUid}]. Pulando.`);
    return;
  }
  console.log(`Encontrados ${snapshot.size} documentos para migrar em [${name}].`);


  let batch = db.batch();
  let operationsInBatch = 0;

  for (const doc of snapshot.docs) {
    if (DRY_RUN) {
        const data = doc.data();
        const label = name === "events" ? `Evento "${data.nome_evento}"` : `Fechamento de ${data.djName}`;
        console.log(`  [DRY RUN] Atualizaria ${doc.id} (${label})`);
    } else {
        const updatePayload: Record<string, any> = {
            [uidField]: NEW_UID,
            ...(extraUpdates || {}),
        };
        batch.update(doc.ref, updatePayload);
        operationsInBatch++;

        if (operationsInBatch >= 450) {
            console.log("  -> Enviando lote de 450 operações...");
            await batch.commit();
            batch = db.batch();
            operationsInBatch = 0;
        }
    }
  }

  if (!DRY_RUN && operationsInBatch > 0) {
    console.log(`  -> Enviando lote final de ${operationsInBatch} operações...`);
    await batch.commit();
  }

  console.log(`--- Migração para [${name}] com UID [${oldUid}] concluída ---`);
}

async function finalVerification() {
    console.log("\n=== VERIFICAÇÃO PÓS-MIGRAÇÃO ===");
    let foundOldData = false;
    for (const target of TARGETS) {
        for (const oldUid of OLD_UIDS) {
            const count = await db.collection(target.name).where(target.uidField, "==", oldUid).get().then(s => s.size);
            console.log(`- Documentos em [${target.name}] com o UID antigo ${oldUid}: ${count} (esperado: 0)`);
            if (count > 0) foundOldData = true;
        }
    }

    if (foundOldData) {
        console.error("\n[ERRO] Verificação falhou. Ainda existem dados com UIDs antigos.");
    } else {
        console.log("\n[SUCESSO] Verificação concluída. Nenhum UID antigo encontrado nos campos migrados.");
    }
    console.log("===================================");
}


async function main() {
  try {
    console.log("Iniciando script de migração de UID de DJ...");
    
    await assertNewUserExists();
    await dryRunReport();

    if (DRY_RUN) {
      console.log("\nDRY_RUN está ativo. Nenhuma alteração será feita. Para executar a migração, edite o script e mude DRY_RUN para false.");
      return;
    }

    // Se não for dry run, pede uma confirmação final.
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    await new Promise(resolve => {
        readline.question('Você está prestes a executar a migração de dados. Esta ação é IRREVERSÍVEL. Digite "MIGRAR" para continuar: ', (answer: string) => {
            if (answer === "MIGRAR") {
                resolve(true);
            } else {
                console.log("Migração cancelada pelo usuário.");
                process.exit(0);
            }
            readline.close();
        });
    });

    console.log("\nIniciando a execução da migração...");
    for (const target of TARGETS) {
      for (const oldUid of OLD_UIDS) {
        await migrateCollection(target, oldUid);
      }
    }

    await finalVerification();

    console.log("\nScript de migração concluído.");

  } catch (error) {
    console.error("\nOcorreu um erro fatal durante a migração:", error);
    process.exit(1);
  }
}

main();
