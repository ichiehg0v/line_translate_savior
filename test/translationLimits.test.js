const test = require('node:test');
const assert = require('node:assert/strict');
const {
    MAX_TARGET_LANGUAGES,
    MAX_LANGUAGE_NAME_LENGTH,
    MAX_TRANSLATION_INPUT_LENGTH,
    TranslationLimitError,
    normalizeTargetLanguages,
    assertTranslationInput
} = require('../src/utils/translationLimits');

test('deduplicates language names case-insensitively', () => {
    assert.deepEqual(
        normalizeTargetLanguages(['Japanese', ' japanese ', '繁體中文']),
        ['Japanese', '繁體中文']
    );
});

test('preserves the maximum legitimate number of unique languages', () => {
    const languages = Array.from({ length: MAX_TARGET_LANGUAGES }, (_, index) => `Language ${index}`);
    assert.deepEqual(normalizeTargetLanguages(languages), languages);
});

test('rejects a sixth unique language instead of creating more model work', () => {
    const languages = Array.from({ length: MAX_TARGET_LANGUAGES + 1 }, (_, index) => `Language ${index}`);
    assert.throws(
        () => normalizeTargetLanguages(languages),
        error => error instanceof TranslationLimitError && error.code === 'too_many_languages'
    );
});

test('rejects overlong language names', () => {
    assert.throws(
        () => normalizeTargetLanguages(['x'.repeat(MAX_LANGUAGE_NAME_LENGTH + 1)]),
        error => error instanceof TranslationLimitError && error.code === 'language_too_long'
    );
});

test('bounds translation input length', () => {
    assert.doesNotThrow(() => assertTranslationInput('x'.repeat(MAX_TRANSLATION_INPUT_LENGTH)));
    assert.throws(
        () => assertTranslationInput('x'.repeat(MAX_TRANSLATION_INPUT_LENGTH + 1)),
        error => error instanceof TranslationLimitError && error.code === 'text_too_long'
    );
});
