import {
  SchemaFieldTypes,
  VectorAlgorithms,
  createClient,
} from "redis";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const client = createClient({
    url: process.env.REDIS_URL!
  });
  try {
    

    client.on("error", (err) => console.log("Redis Client Error", err));
    await client.connect();

    const res = await client.ft.CREATE(
      "productIndx",
      {
        embedding: {
          AS: "embedding",
          type: SchemaFieldTypes.VECTOR,
          ALGORITHM: VectorAlgorithms.FLAT,
          TYPE: "float32",
          BLOCK_SIZE: 5,
          DIM: 1536,
          DISTANCE_METRIC: "COSINE",
          INITIAL_CAP: 5,
        },
      },
      { ON: "HASH", PREFIX: "product" }
    );
    console.log(res);

    
  } catch (err) {
    console.log(err);
  }
  await client.disconnect();
}
main();
