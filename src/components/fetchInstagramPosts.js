export const fetchInstagramMedia = async (accessToken) => {
    const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url&access_token=${accessToken}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
            console.error('Instagram API error response:', response.status, data);
            // API 응답에서 에러 메시지를 적절하게 추출합니다.
            const errorMessage = data.error ? data.error.message : 'Unknown error occurred';
            throw new Error(`Failed to fetch data from Instagram: ${response.status} ${errorMessage}`);
        }
        console.log('Instagram data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching Instagram data:', error);
        throw error;
    }
};

export const fetchInstagramPosts = async (accessToken) => {
    const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url&access_token=${accessToken}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
            console.error('Instagram API error response:', response.status, data);
            throw new Error(`Failed to fetch data from Instagram: ${response.status} ${data.error.message}`);
        }
        console.log('Instagram data:', data);
        return data;
    } catch (error) {
        console.error('Error fetching Instagram data:', error);
        throw error;
    }
};