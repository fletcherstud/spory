const searchWikipedia = async (keyword: string) => {
  try {
    const searchResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        keyword
      )}&format=json&origin=*&srlimit=1`
    );
    const searchData = await searchResponse.json();
    if (searchData.query?.search?.length > 0) {
      const topResult = searchData.query.search[0];
      return topResult.title;
    }
    return null;
  } catch (error) {
    console.error("Error searching Wikipedia:", error);
    return null;
  }
};

export const getWikiData = async (keyword: string) => {
  try {
    // First search for the most relevant article title
    const articleTitle = await searchWikipedia(keyword);
    if (!articleTitle) {
      throw new Error('No Wikipedia article found');
    }

    // Then get the article summary using the correct title
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        articleTitle
      )}`
    );
    const data = await response.json();

    if (data.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") {
      throw new Error('Wikipedia article not found');
    }

    return {
      thumbnail: data.thumbnail?.source || null,
      title: data.title || keyword,
      extract: data.extract || "",
      url: data.content_urls?.desktop?.page || null,
    };
  } catch (error) {
    console.error("Error getting Wikipedia data:", error);
    throw error;
  }
}; 