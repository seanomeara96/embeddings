package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/joho/godotenv"

	openai "github.com/sashabaranov/go-openai"
	bigcommerce "github.com/seanomeara96/go-bigcommerce"
)

type ProductEmbeddings struct {
	ProductID   int
	ProductName string
	Embeddings  []float32
}

// Calculate the cosine similarity between two vectors
func cosineSimilarity(vec1, vec2 []float32) float32 {
	var dotProduct float32 = 0.0
	var normVec1 float32 = 0.0
	var normVec2 float32 = 0.0

	for i := 0; i < len(vec1); i++ {
		dotProduct += vec1[i] * vec2[i]
		normVec1 += vec1[i] * vec1[i]
		normVec2 += vec2[i] * vec2[i]
	}

	if normVec1 == 0 || normVec2 == 0 {
		return 0.0
	}

	return dotProduct / (float32(math.Sqrt(float64(normVec1))) * float32(math.Sqrt(float64(normVec2))))
}

// Find the K nearest neighbors to the given string
func findNearestNeighbors(data []ProductEmbeddings, query string, k int) []ProductEmbeddings {
	fmt.Println("starting search for nearest neighbours...")
	// Calculate the similarity between the query and each struct
	similarities := make([]float32, len(data))
	embeddingsFromText := getEmbeddingsFromText(query)
	for i, d := range data {
		similarities[i] = cosineSimilarity(d.Embeddings, embeddingsFromText)
	}

	// Sort the similarities in descending order
	sortedIndices := make([]int, len(data))
	for i := range sortedIndices {
		sortedIndices[i] = i
	}
	sort.Slice(sortedIndices, func(i, j int) bool {
		return similarities[sortedIndices[i]] > similarities[sortedIndices[j]]
	})

	// Retrieve the K nearest neighbors
	neighbors := make([]ProductEmbeddings, k)
	for i := 0; i < k; i++ {
		neighbors[i] = data[sortedIndices[i]]
	}
	fmt.Println("found neighbours")
	return neighbors
}

func getEmbeddingsFromText(text string) []float32 {
	// Your implementation to generate or retrieve embeddings from the given text
	// Return an array of floats representing the embeddings
	// ...
	client := openai.NewClient(os.Getenv("OPENAI_API_KEY"))

	resp, err := client.CreateEmbeddings(context.Background(), openai.EmbeddingRequest{
		Model: openai.AdaEmbeddingV2,
		Input: []string{text},
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("openai responded with embeddings")
	return resp.Data[0].Embedding
}

func main() {
	err := godotenv.Load()
	if err != nil {
		panic(err)
	}

	storeHash := os.Getenv("PX_STORE_HASH")
	xAuthToken := os.Getenv("PX_XAUTHTOKEN")

	px := bigcommerce.NewClient("3", storeHash, xAuthToken)

	products, err := px.GetFullProductCatalog(250)
	if err != nil {
		panic(err)
	}

	var productEmbeddings []ProductEmbeddings

	for i := 0; i < len(products); i++ {
		var product *bigcommerce.Product = &products[i]

		floatString := product.SearchKeywords

		// Remove the square brackets from the string
		floatString = strings.Trim(floatString, "[]")

		// Split the string by commas to get individual float values
		stringSlice := strings.Split(floatString, ",")

		// Create a slice to store the parsed float values
		floatSlice := make([]float32, len(stringSlice))

		// Iterate over the string slice and parse each value
		for i, str := range stringSlice {
			// Remove any leading or trailing whitespaces from the float value
			str = strings.TrimSpace(str)

			value, err := strconv.ParseFloat(str, 64)
			if err != nil {
				fmt.Printf("Error parsing float: %v\n", err)
				return
			}
			floatSlice[i] = float32(value)
		}

		productEmbedding := ProductEmbeddings{
			ProductID:   product.ID,
			ProductName: product.Name,
			Embeddings:  floatSlice,
		}

		productEmbeddings = append(productEmbeddings, productEmbedding)

	}
	fmt.Println("all embeddings parsed")
	// Query string
	query := "blonde hair, dyed or bleached"

	// Find the 2 nearest neighbors
	k := 10
	neighbors := findNearestNeighbors(productEmbeddings, query, k)

	// Print the retrieved neighbors
	for _, neighbor := range neighbors {
		fmt.Printf("ID: %d, Name: %s\n", neighbor.ProductID, neighbor.ProductName)
	}

}
