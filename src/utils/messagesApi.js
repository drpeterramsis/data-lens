import { getFileFromGitHub, saveFileToGitHub } from '../services/githubService';

const MESSAGES_PATH = 'src/data/messages.json'

// Load messages from GitHub
export const loadMessages = async () => {
  try {
    const { content, sha } = await getFileFromGitHub(MESSAGES_PATH)
    return { messages: content.messages || [], sha }
  } catch (error) {
    if (error.message && error.message.includes('404')) {
        return { messages: [], sha: '' }
    }
    throw error;
  }
}

// Save messages to GitHub
export const saveMessages = async (messages, sha, commitMsg) => {
  // Always get current SHA first to prevent 409 conflicts
  const { sha: currentSha } = await getFileFromGitHub(MESSAGES_PATH)

  return await saveFileToGitHub(
    MESSAGES_PATH,
    { messages },
    currentSha, 
    commitMsg || 'Admin: Update messages'
  )
}
