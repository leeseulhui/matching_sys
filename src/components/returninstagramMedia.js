export const returnInstagramMedia = async (access_token) => {
  try {
      const url = `https://graph.instagram.com/me/media?fields=id,media_type,media_url,username&access_token=${access_token}`;
      const response = await fetch(url);
      if (!response.ok) {
          throw new Error('Network response was not ok');
      }
      const data = await response.json();
      console.log(data);
      return data;
  } catch (error) {
      console.error('Error fetching Instagram data:', error.toString());
  }
};
