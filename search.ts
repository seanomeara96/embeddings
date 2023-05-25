import { createClient, SchemaFieldTypes, VectorAlgorithms } from "redis";
import data from "./products.json";
import dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";

const products = data as any[];

dotenv.config();
async function main() {
  try {
    // This example demonstrates how to use RediSearch to index and query data
    // stored in Redis hashes using vector similarity search.
    //
    // Inspired by RediSearch Python tests:
    // https://github.com/RediSearch/RediSearch/blob/06e36d48946ea08bd0d8b76394a4e82eeb919d78/tests/pytests/test_vecsim.py#L96

    const client = createClient({
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: "redis-16768.c2.eu-west-1-3.ec2.cloud.redislabs.com",
        port: 16768,
      },
    });

    await client.connect();

    function float32Buffer(arr: number[]) {
      return Buffer.from(new Float32Array(arr).buffer);
    }

    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const openai = new OpenAIApi(configuration);

    const input = `What products are recomended for protecting dyed hair?`;

    const embeddingResponse = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input,
    });

    if (embeddingResponse.status !== 200) {
      throw embeddingResponse;
    }

    const [responseData] = embeddingResponse.data.data;

    // Perform a K-Nearest Neighbors vector similarity search
    // Documentation: https://redis.io/docs/stack/search/reference/vectors/#pure-knn-queries
    const results = await client.ft.search(
      "productIndx",
      "*=>[KNN 4 @embedding $BLOB AS dist]",
      {
        PARAMS: {
          BLOB: float32Buffer(responseData.embedding),
        },
        SORTBY: "dist",
        DIALECT: 2,
        RETURN: ["id", "dist"],
      }
    );

    const { documents } = results;

    let contextText = "";

    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      contextText += JSON.stringify(
        products[parseInt(document.value.id as string)]
      );
    }

    const prompt = `You are a very enthusiastic beautyfeatures representative who loves to help prople. Given the following products from the beautyfeatures catalog answer the question and make recommendations. If you are unsure and the answer is not to be found in the provided information say "Sorry I dont know how to help with that"
    
Context sections: ${contextText}

Question:"""
${input}
"""`;

    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 1000,
      temperature: 0,
    });

    console.log(response.data.choices[0].text)

    await client.quit();
  } catch (err) {
    console.log(err);
  }
}
main();
