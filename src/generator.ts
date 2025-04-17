import { config } from './config'
import { Ollama } from 'ollama'
import * as vscode from 'vscode'
import { OLLAMA_URL } from './constants'
import type { EmojisMap } from './types/llm'

export async function getSummary(diff: string): Promise<string> {
	const { summaryPrompt, endpoint, summaryTemperature, modelName } =
		config.inference
	const ollama = new Ollama({ host: endpoint })

	const defaultSummaryPrompt = `You are an expert developer specialist in creating commits.
	Provide a super concise one sentence overall changes summary of the user \`git diff\` output following strictly the next rules:
	- Do not use any code snippets, imports, file routes or bullets points.
	- Do not mention the route of file that has been change.
	- Simply describe the MAIN GOAL of the changes.
	- Output directly the summary in plain text.`

	const prompt = summaryPrompt || defaultSummaryPrompt

	try {
		const res = await ollama.chat({
			model: modelName,
			options: {
				temperature: summaryTemperature,
			},
			messages: [
				{
					role: 'system',
					content: prompt,
				},
				{
					role: 'user',
					content: `Here is the \`git diff\` output: ${diff}`,
				},
			],
		})

		return res.message.content
			.trimStart()
			.split('\n')
			.map((v) => v.trim())
			.join('\n')
	} catch (error: any) {
		if (error?.status_code === 404) {
			const errorMessage =
				error.message.charAt(0).toUpperCase() + error.message.slice(1)

			vscode.window
				.showErrorMessage(errorMessage, 'Go to ollama website', 'Pull model')
				.then((action) => {
					if (action === 'Go to ollama website') {
						vscode.env.openExternal(vscode.Uri.parse(OLLAMA_URL))
					}
					if (action === 'Pull model') {
						vscode.commands.executeCommand(
							'commitollama.runOllamaPull',
							modelName,
						)
					}
				})

			throw new Error()
		}

		throw new Error(
			'Unable to connect to ollama. Please, check that ollama is running.',
		)
	}
}

export async function getScope(diff: string): Promise<string> {
	const { scopePrompt, endpoint, scopeTemperature, modelName } =
		config.inference
	const ollama = new Ollama({ host: endpoint })

	const defaultScopePrompt = `You are an expert developer specialist in creating commits.
	Provide a single word scope of the path of the \`git diff\` output following strictly the next rules:
	- Always use a single lower case word.
	- Do not use any code snippets, imports or bullets points.
	- The scope is defined by the file path and is the first folder form the root of the project that makes sense.`


	const prompt = scopePrompt || defaultScopePrompt

	const diffPath = diff.split('\n')[0].split(' ')[2]
	console.log(diffPath)

	try {
		const res = await ollama.chat({
			model: modelName,
			options: {
				temperature: scopeTemperature,
			},
			messages: [
				{
					role: 'system',
					content: prompt,
				},
				{
					role: 'user',
					content: `Here is the path of the \`git diff\` output: ${diffPath}`,
				},
			],
		})

		return res.message.content
			.trimStart()
			.split('\n')
			.map((v) => v.trim())
			.join('\n')
	} catch (error: any) {
		if (error?.status_code === 404) {
			const errorMessage =
				error.message.charAt(0).toUpperCase() + error.message.slice(1)

			vscode.window
				.showErrorMessage(errorMessage, 'Go to ollama website', 'Pull model')
				.then((action) => {
					if (action === 'Go to ollama website') {
						vscode.env.openExternal(vscode.Uri.parse(OLLAMA_URL))
					}
					if (action === 'Pull model') {
						vscode.commands.executeCommand(
							'commitollama.runOllamaPull',
							modelName,
						)
					}
				})

			throw new Error()
		}

		throw new Error(
			'Unable to connect to ollama. Please, check that ollama is running.',
		)
	}
}
export async function getCommitMessage(summaries: string[], scopes: string[]) {
	const {
		commitPrompt,
		endpoint,
		commitTemperature,
		useDescription,
		useEmojis,
		commitEmojis,
		modelName,
		useLowerCase,
		commitTemplate,
	} = config.inference

	const ollama = new Ollama({ host: endpoint })

	const defaultCommitPrompt = `You are an expert developer specialist in creating commits messages.
	Your only goal is to retrieve a single commit message. 
	Based on the provided user changes, combine them in ONE SINGLE commit message retrieving the global idea, following strictly the next rules:
	- Assign the commit {type} according to the next conditions: 
	feat: Only when adding a new feature.
	fix: When fixing a bug. 
	docs: When updating documentation. 
	style: When changing elements styles or design and/or making changes to the code style (formatting, missing semicolons, etc.) without changing the code logic.
	test: When adding or updating tests. 
	chore: When making changes to the build process or auxiliary tools and libraries. 
	revert: When undoing a previous commit.
	refactor: When restructuring code without changing its external behavior, or is any of the other refactor types.
	- Do not add any issues numeration, explain your output nor introduce your answer.
	- Output directly only one commit message in plain text with the next format: \`{type}: {commit_message}\`.
	- Be as concise as possible, keep the message under 50 characters.`

	const prompt = commitPrompt || defaultCommitPrompt

	try {
		const response = await ollama.chat({
			model: modelName,
			options: {
				temperature: commitTemperature,
				num_predict: 45,
			},
			messages: [
				{
					role: 'system',
					content: prompt,
				},
				{
					role: 'user',
					content: `Here are the summaries changes: ${summaries.join(', ')}`,
				},
			],
		})

		let commit = response.message.content.replace(/["`]/g, '')

		// Handle lower and upper case commit messages
		const [type, ...messageParts] = commit.split(':')
		const message = messageParts.join(':').trim()
		const commitMessage = useLowerCase
			? message.charAt(0).toLowerCase() + message.slice(1)
			: message.charAt(0).toUpperCase() + message.slice(1)

		// Handle emojis
		const emoji = useEmojis ? commitEmojis?.[type as keyof EmojisMap] : ''

		// Handle scope
		const scope = Array.from(new Set(scopes)).sort().join('/')

		// Replace placeholders with actual values
		commit = commitTemplate
			.replace('{{scope}}', scope)
			.replace('{{type}}', type)
			.replace('{{message}}', commitMessage)
			.replace('{{emoji}}', emoji)
			.replace(/\s+/g, ' ') // Replace multiple spaces with single space
			.replace(/\s+:/g, ':') // Remove space before colon

		// Add files summaries as description if useDescription is activated
		if (useDescription) {
			commit = `${commit}\n\n${summaries.map((s) => `- ${s}`).join('\n')}`
		}

		return commit.trim()
	} catch (error) {
		throw new Error('Unable to generate commit.')
	}
}
