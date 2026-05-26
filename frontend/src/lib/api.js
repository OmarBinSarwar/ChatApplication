export const BASE_URL = 'http://localhost:3000';

export const fetchApi = async (url, options = {}) => {
  options.credentials = 'include'; // for cookies
  if (!(options.body instanceof FormData)) {
    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (options.body && typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(`${BASE_URL}${url}`, options);
  
  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorMsg;
    } catch(e) {}
    throw new Error(errorMsg);
  }
  
  return response.json();
};
