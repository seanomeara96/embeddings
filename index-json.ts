import { RediSearchSchema, SchemaFieldTypes, createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const indexCommand = `FT.CREATE  productIdx ON JSON 
PREFIX 1 product: 
SCHEMA 
$.id AS id numeric
$.name AS name TEXT
$.sku AS sku TEXT 
$.description as description TEXT 
$.retail_price AS retail_price NUMERIC
$.sale_price AS sale_price NUMERIC
$.url AS url TEXT 
$.embedding AS embedding VECTOR FLAT 10 
    "TYPE" "FLOAT32"
    "DIM" 1536
    "DISTANCE_METRIC" "COSINE"
    "INITIAL_CAP" 5
    "BLOCK_SIZE" 5
`;

async function main() {
  const client = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: "redis-16768.c2.eu-west-1-3.ec2.cloud.redislabs.com",
      port: 16768,
    },
  });

  client.on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();
  const x: RediSearchSchema = {
    "$.id": {
      AS: "id",
      type: SchemaFieldTypes.NUMERIC,
    },
    "$.name": {
      AS: "name",
      type: SchemaFieldTypes.TEXT,
    },
    "$.sku": {
      AS: "sku",
      type: SchemaFieldTypes.TEXT,
    },
  };

  client.ft.CREATE("productIndx", x, { ON: "JSON", PREFIX: "product" });

  await client.disconnect();
}
main();
