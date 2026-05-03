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
    const owner = import.meta.env.VITE_GITHUB_OWNER;
    const repo = import.meta.env.VITE_GITHUB_REPO;
    
    if (!owner || owner === 'your-username' || !repo || repo === 'your-repo-name') {
      throw new Error('GitHub repository details are not configured.');
    }

    const response = await fetch(`${getBaseUrl()}/${filePath}?ref=${getBranch()}`, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // GitHub API returns content as base64
    const decodedContent = decodeURIComponent(escape(window.atob(data.content)));
    
    return {
      content: decodedContent,
      sha: data.sha
    };
  } catch (error) {
    // throw error to be handled by caller
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
    const owner = import.meta.env.VITE_GITHUB_OWNER;
    const repo = import.meta.env.VITE_GITHUB_REPO;
    
    if (!owner || owner === 'your-username' || !repo || repo === 'your-repo-name') {
      throw new Error('GitHub repository details are not configured.');
    }

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
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // throw error to be handled by caller
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

/**
 * Gets the file content and SHA from GitHub, parsing it as JSON
 * @param {string} filePath 
 * @returns {Promise<{content: any, sha: string}>}
 */
export const getFileFromGitHub = async (filePath) => {
  try {
    const { content, sha } = await getFileContent(filePath);
    return { content: JSON.parse(content), sha };
  } catch (error) {
    // Only log if it's not a missing config error
    if (error.message && !error.message.includes('not configured')) {
       // Silently fail on 404 or when dummy repo fails
       // console.error(`Error parsing JSON from GitHub for ${filePath}:`, error.message);
    }
    throw error;
  }
};

/**
 * Saves JSON document to GitHub API
 * @param {string} filePath 
 * @param {object} jsonData 
 * @param {string} sha 
 * @param {string} commitMessage 
 * @returns {Promise<boolean>}
 */
export const saveFileToGitHub = async (filePath, jsonData, sha, commitMessage) => {
  try {
    const newContent = JSON.stringify(jsonData, null, 2);
    await updateFileContent(filePath, newContent, sha, commitMessage);
    return true;
  } catch (error) {
    if (error.message && !error.message.includes('not configured')) {
      // console.error('Error saving JSON file to GitHub:', error.message);
    }
    return false;
  }
};

/**
 * Always fetch fresh SHA before any update
 * @param {string} filePath 
 * @returns {Promise<string>}
 */
export const getLatestSHA = async (filePath) => {
  try {
    const { sha } = await getFileContent(filePath);
    return sha;
  } catch (error) {
    // throw error instead of logging
    throw error;
  }
};

/**
 * Uploads a binary file to GitHub using base64 encoding
 * @param {string} filePath - destination path (e.g., 'public/skillzaty/thumbs/img.png')
 * @param {File} file - the file object from input[type="file"]
 * @param {string} commitMessage - descriptive commit message
 * @returns {Promise<{success: boolean, rawUrl: string}>}
 */
export const uploadFileToGitHub = async (filePath, file, commitMessage) => {
  try {
    const reader = new FileReader();
    const base64Promise = new Promise((resolve) => {
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });

    const base64Content = await base64Promise;
    let sha = null;

    // Check if file exists to get SHA for update
    try {
      const existing = await getFileContent(filePath);
      sha = existing.sha;
    } catch (e) {
      // File doesn't exist, sha remains null
    }

    const body = {
      message: commitMessage,
      content: base64Content,
      branch: getBranch()
    };
    if (sha) body.sha = sha;

    const response = await fetch(`${getBaseUrl()}/${filePath}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }

    const owner = import.meta.env.VITE_GITHUB_OWNER;
    const repo = import.meta.env.VITE_GITHUB_REPO;
    const branch = getBranch();
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

    return { success: true, rawUrl };
  } catch (error) {
    console.error('Error uploading file to GitHub:', error);
    throw error;
  }
};

/**
 * Gets the SkillZaty data and SHA
 * @returns {Promise<{content: object, sha: string}>}
 */
export const getSkillZaty = async () => {
  const filePath = 'src/data/skillzaty.json';
  try {
    return await getFileFromGitHub(filePath);
  } catch (error) {
    if (error.message && error.message.includes('404')) {
      return { content: { categories: [] }, sha: '' };
    }
    throw error;
  }
};

/**
 * Saves SkillZaty data to GitHub
 * @param {object} data - the JSON data
 * @param {string} sha - current SHA
 * @param {string} commitMessage 
 * @returns {Promise<boolean>}
 */
export const saveSkillZaty = async (data, sha, commitMessage) => {
  const filePath = 'src/data/skillzaty.json';
  return await saveFileToGitHub(filePath, data, sha, commitMessage);
};
