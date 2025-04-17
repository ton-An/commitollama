import { type EmojisMap, type Model, Models } from './types/llm'
import { getConfig } from './utils'

export const defaultConfig = {
	endpoint: 'http://127.0.0.1:11434',
}

class Config {
	get inference() {
		// Load model
		const configModel = getConfig('model') as keyof typeof Models
		let modelName: string | Model = Models[configModel]

		if (configModel === 'Custom') {
			modelName = getConfig('custom.model') || ''
		}

		// Load Emojis config
		const useEmojis = getConfig('useEmojis') as boolean
		const commitEmojis = JSON.parse(JSON.stringify(getConfig('commitEmojis'))) as EmojisMap
		const useDescription = getConfig('useDescription') as boolean

		// Load useLowerCase config
		const useLowerCase = getConfig('useLowerCase') as boolean

		// Load commitTemplate config
		const commitTemplate = getConfig('commitTemplate') as string

		// Load endpoint
		let endpoint = getConfig('custom.endpoint') || defaultConfig.endpoint
		if (endpoint.endsWith('/')) {
			endpoint = endpoint.slice(0, -1).trim()
		}

		// Load custom prompt and temperatures
		const summaryPrompt = getConfig('custom.summaryPrompt')
		const summaryTemperature = getConfig('custom.summaryTemperature') as number

		const commitPrompt = getConfig('custom.commitPrompt')
		const commitTemperature = getConfig('custom.commitTemperature') as number

		const scopePrompt = getConfig('custom.scopePrompt')
		const scopeTemperature = getConfig('custom.scopeTemperature') as number

		return {
			endpoint,
			modelName,
			summaryPrompt,
			summaryTemperature,
			commitPrompt,
			commitTemperature,
			scopePrompt,
			scopeTemperature,
			useDescription,
			useEmojis,
			commitEmojis,
			useLowerCase,
			commitTemplate,
		}
	}
}

export const config = new Config()
