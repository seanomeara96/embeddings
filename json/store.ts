import data from "../products.json";
import { Configuration, OpenAIApi } from "openai";

import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const options = {
  url: process.env.REDIS_URL
}

async function main() {
  try {
    const client = createClient(options);

    client.on("error", (err) => console.log("Redis Client Error", err));

    await client.connect()

    console.log("hello")
    
    const products = data as any[];


    for (let i = 0; i < products.length; i++) {
      console.log(`${i} / ${products.length}`);
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

        await client.json.SET("product:" + i, ".", {
          id: i,
          embedding: responseData.embedding,
        });

        await new Promise((res) => setTimeout(res, 700));
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
