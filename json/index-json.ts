import {
  RediSearchSchema,
  SchemaFieldTypes,
  VectorAlgorithms,
  createClient,
} from "redis";
import dotenv from "dotenv";
dotenv.config();

const indexCommand = `FT.CREATE  productIdx ON JSON 
PREFIX 1 product 
SCHEMA 
$.id AS id numeric
$.embedding AS embedding VECTOR FLAT 10 
    "TYPE" "FLOAT32"
    "DIM" 1536
    "DISTANCE_METRIC" "COSINE"
    "INITIAL_CAP" 5
    "BLOCK_SIZE" 5
`;

async function main() {
  try {
    const client = createClient({
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: "redis-16768.c2.eu-west-1-3.ec2.cloud.redislabs.com",
        port: 16768,
      },
    });

    client.on("error", (err) => console.log("Redis Client Error", err));
    await client.connect();
    const schema: RediSearchSchema = {
      "$.id": {
        AS: "id",
        type: SchemaFieldTypes.NUMERIC,
      },
      "$.embedding": {
        AS: "embedding",
        type: SchemaFieldTypes.VECTOR,
        ALGORITHM: VectorAlgorithms.FLAT,
        TYPE: "float32",
        BLOCK_SIZE: 5,
        DIM: 1536,
        DISTANCE_METRIC: "COSINE",
        INITIAL_CAP: 5,
      },
    };

    const res = await client.ft.CREATE("productIndx", schema, { ON: "JSON", PREFIX: "product" });
    console.log(res)


    await client.disconnect();
  } catch (err) {
    console.log(err);
  }
}
main();
