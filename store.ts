import data from "./products.json";
import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
import { createClient } from "redis";

dotenv.config();

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

    const products = data as any[];
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      try {
        const configuration = new Configuration({
          apiKey: process.env.OPENAI_API_KEY,
        });
        const openai = new OpenAIApi(configuration);

        const input = JSON.stringify(product).replace(/\n/g, " ");

        const embeddingResponse = await openai.createEmbedding({
          model: "text-embedding-ada-002",
          input,
        });

        if (embeddingResponse.status !== 200) {
          throw embeddingResponse;
        }

        const [responseData] = embeddingResponse.data.data;

        product.embedding = responseData.embedding;

        console.log(product);

        await client.json.SET(
          "product:" + product.id.toString(),
          ".",
          JSON.stringify(product)
        );

        break;
      } catch (err) {
        console.log(err);
        break;
      }
    }
    await client.disconnect();
  } catch (err) {
    console.log(err);
  }
}
main();
