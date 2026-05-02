/**
 * Service to interact directly with GitHub Contents API
 * to read and write JSON files from the repository.
 */

const getHeaders = () => {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
};

const getBaseUrl = () => {
  const owner = import.meta.env.VITE_GITHUB_OWNER;
  const repo = import.meta.env.VITE_GITHUB_REPO;
  return `https://api.github.com/repos/${owner}/${repo}/contents`;
};

const getBranch = () => import.meta.env.VITE_GITHUB_BRANCH || 'main';

/**
 * Gets the file content and SHA from GitHub
 * @param {string} filePath - path from repo root (e.g., 'src/data/users.json')
 * @returns {Promise<{content: string, sha: string}>}
 */
export const getFileContent = async (filePath) => {
  try {
    const response = await fetch(`${getBaseUrl()}/${filePath}?ref=${getBranch()}`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // GitHub API returns content as base64
    const decodedContent = decodeURIComponent(escape(window.atob(data.content)));
    
    return {
      content: decodedContent,
      sha: data.sha
    };
  } catch (error) {
    console.error('Error fetching file from GitHub:', error);
    throw error;
  }
};

/**
 * Updates a file on GitHub
 * @param {string} filePath - path from repo root
 * @param {string} newContent - the new string content for the file
 * @param {string} sha - the current blob SHA of the file (required for updates)
 * @param {string} commitMessage - descriptive commit message
 * @returns {Promise<any>}
 */
export const updateFileContent = async (filePath, newContent, sha, commitMessage) => {
  try {
    // Encode to base64 properly handling unicode characters
    const encodedContent = window.btoa(unescape(encodeURIComponent(newContent)));

    const body = {
      message: commitMessage,
      content: encodedContent,
      sha: sha,
      branch: getBranch()
    };

    const response = await fetch(`${getBaseUrl()}/${filePath}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating file on GitHub:', error);
    throw error;
  }
};

/**
 * Validates if the string is valid JSON
 * @param {string} jsonString 
 * @returns {{isValid: boolean, error: string|null}}
 */
export const validateJSON = (jsonString) => {
  try {
    JSON.parse(jsonString);
    return { isValid: true, error: null };
  } catch (e) {
    return { isValid: false, error: e.message };
  }
};
