const MAX_TARGET_LANGUAGES = 5;
const MAX_LANGUAGE_NAME_LENGTH = 40;
const MAX_TRANSLATION_INPUT_LENGTH = 2000;

class TranslationLimitError extends Error {
    constructor(code, message) {
        super(message);
        this.name = 'TranslationLimitError';
        this.code = code;
    }
}

function normalizeTargetLanguages(values) {
    if (!Array.isArray(values)) {
        throw new TranslationLimitError('invalid_languages', 'Target languages must be an array.');
    }

    const languages = [];
    const seen = new Set();

    for (const value of values) {
        if (typeof value !== 'string') {
            throw new TranslationLimitError('invalid_language', 'Each target language must be text.');
        }

        const language = value.trim();
        if (!language) continue;

        if (language.length > MAX_LANGUAGE_NAME_LENGTH) {
            throw new TranslationLimitError(
                'language_too_long',
                `Language names must be at most ${MAX_LANGUAGE_NAME_LENGTH} characters.`
            );
        }

        const key = language.toLocaleLowerCase('en-US');
        if (seen.has(key)) continue;

        if (languages.length >= MAX_TARGET_LANGUAGES) {
            throw new TranslationLimitError(
                'too_many_languages',
                `At most ${MAX_TARGET_LANGUAGES} target languages are allowed.`
            );
        }

        seen.add(key);
        languages.push(language);
    }

    return languages;
}

function assertTranslationInput(text) {
    if (typeof text !== 'string') {
        throw new TranslationLimitError('invalid_text', 'Translation input must be text.');
    }

    if (text.length > MAX_TRANSLATION_INPUT_LENGTH) {
        throw new TranslationLimitError(
            'text_too_long',
            `Translation input must be at most ${MAX_TRANSLATION_INPUT_LENGTH} characters.`
        );
    }
}

module.exports = {
    MAX_TARGET_LANGUAGES,
    MAX_LANGUAGE_NAME_LENGTH,
    MAX_TRANSLATION_INPUT_LENGTH,
    TranslationLimitError,
    normalizeTargetLanguages,
    assertTranslationInput
};
