import { faker } from '@faker-js/faker';

/**
 * Bruno Dynamic Variables Generator
 * 
 * This module provides support for Bruno-style dynamic variables using Faker.js.
 * Variables prefixed with $ (e.g., {{$randomUUID}}) are dynamically generated
 * on each call, enabling realistic test data generation.
 * 
 * Reference: https://docs.usebruno.com/testing/script/dynamic-variables
 */

type DynamicVariableGenerator = () => string | number | boolean;

/**
 * Map of all Bruno dynamic variables to their Faker.js generator functions
 */
const dynamicVariableGenerators: Record<string, DynamicVariableGenerator> = {
  // ============================================
  // Basic Data Types
  // ============================================
  'guid': () => faker.string.uuid(),
  'timestamp': () => Date.now(),
  'isoTimestamp': () => new Date().toISOString(),
  'randomUUID': () => faker.string.uuid(),
  'randomNanoId': () => faker.string.nanoid(),
  'randomAlphaNumeric': () => faker.string.alphanumeric(1),
  'randomBoolean': () => faker.datatype.boolean(),
  'randomInt': () => faker.number.int({ min: 0, max: 1000 }),
  'randomColor': () => faker.color.human(),
  'randomHexColor': () => faker.internet.color(),
  'randomAbbreviation': () => faker.hacker.abbreviation(),
  'randomWord': () => faker.word.sample(),
  'randomWords': () => faker.word.words(),

  // ============================================
  // Internet and Network
  // ============================================
  'randomIP': () => faker.internet.ip(),
  'randomIPV4': () => faker.internet.ipv4(),
  'randomIPV6': () => faker.internet.ipv6(),
  'randomMACAddress': () => faker.internet.mac(),
  'randomPassword': () => faker.internet.password({ length: 15 }),
  'randomLocale': () => faker.location.countryCode('alpha-2').toLowerCase(),
  'randomUserAgent': () => faker.internet.userAgent(),
  'randomProtocol': () => faker.helpers.arrayElement(['http', 'https']),
  'randomSemver': () => faker.system.semver(),
  'randomDomainName': () => faker.internet.domainName(),
  'randomDomainSuffix': () => faker.internet.domainSuffix(),
  'randomDomainWord': () => faker.internet.domainWord(),
  'randomExampleEmail': () => faker.internet.exampleEmail(),
  'randomEmail': () => faker.internet.email(),
  'randomUserName': () => faker.internet.username(),
  'randomUrl': () => faker.internet.url(),

  // ============================================
  // Names and Personal Information
  // ============================================
  'randomFirstName': () => faker.person.firstName(),
  'randomLastName': () => faker.person.lastName(),
  'randomFullName': () => faker.person.fullName(),
  'randomNamePrefix': () => faker.person.prefix(),
  'randomNameSuffix': () => faker.person.suffix(),
  'randomJobArea': () => faker.person.jobArea(),
  'randomJobDescriptor': () => faker.person.jobDescriptor(),
  'randomJobTitle': () => faker.person.jobTitle(),
  'randomJobType': () => faker.person.jobType(),
  'randomPhoneNumber': () => faker.phone.number(),
  'randomPhoneNumberExt': () => `${faker.phone.number()} ext. ${faker.number.int({ min: 100, max: 999 })}`,

  // ============================================
  // Location
  // ============================================
  'randomCity': () => faker.location.city(),
  'randomStreetName': () => faker.location.street(),
  'randomStreetAddress': () => faker.location.streetAddress(),
  'randomCountry': () => faker.location.country(),
  'randomCountryCode': () => faker.location.countryCode(),
  'randomLatitude': () => faker.location.latitude(),
  'randomLongitude': () => faker.location.longitude(),

  // ============================================
  // Images
  // ============================================
  'randomAvatarImage': () => faker.image.avatar(),
  'randomImageUrl': () => faker.image.url(),
  'randomAbstractImage': () => faker.image.urlLoremFlickr({ category: 'abstract' }),
  'randomAnimalsImage': () => faker.image.urlLoremFlickr({ category: 'animals' }),
  'randomBusinessImage': () => faker.image.urlLoremFlickr({ category: 'business' }),
  'randomCatsImage': () => faker.image.urlLoremFlickr({ category: 'cats' }),
  'randomCityImage': () => faker.image.urlLoremFlickr({ category: 'city' }),
  'randomFoodImage': () => faker.image.urlLoremFlickr({ category: 'food' }),
  'randomNightlifeImage': () => faker.image.urlLoremFlickr({ category: 'nightlife' }),
  'randomFashionImage': () => faker.image.urlLoremFlickr({ category: 'fashion' }),
  'randomPeopleImage': () => faker.image.urlLoremFlickr({ category: 'people' }),
  'randomNatureImage': () => faker.image.urlLoremFlickr({ category: 'nature' }),
  'randomSportsImage': () => faker.image.urlLoremFlickr({ category: 'sports' }),
  'randomTransportImage': () => faker.image.urlLoremFlickr({ category: 'transport' }),
  'randomImageDataUri': () => faker.image.dataUri(),

  // ============================================
  // Finance
  // ============================================
  'randomBankAccount': () => faker.finance.accountNumber(),
  'randomBankAccountName': () => faker.finance.accountName(),
  'randomCreditCardMask': () => faker.finance.maskedNumber(),
  'randomBankAccountBic': () => faker.finance.bic(),
  'randomBankAccountIban': () => faker.finance.iban(),
  'randomTransactionType': () => faker.finance.transactionType(),
  'randomCurrencyCode': () => faker.finance.currencyCode(),
  'randomCurrencyName': () => faker.finance.currencyName(),
  'randomCurrencySymbol': () => faker.finance.currencySymbol(),
  'randomBitcoin': () => faker.finance.bitcoinAddress(),

  // ============================================
  // Business
  // ============================================
  'randomCompanyName': () => faker.company.name(),
  'randomCompanySuffix': () => faker.helpers.arrayElement(['LLC', 'Inc.', 'Ltd.', 'Corp.', 'Group']),
  'randomBs': () => faker.company.buzzPhrase(),
  'randomBsAdjective': () => faker.company.buzzAdjective(),
  'randomBsBuzz': () => faker.company.buzzVerb(),
  'randomBsNoun': () => faker.company.buzzNoun(),
  'randomCatchPhrase': () => faker.company.catchPhrase(),
  'randomCatchPhraseAdjective': () => faker.company.catchPhraseAdjective(),
  'randomCatchPhraseDescriptor': () => faker.company.catchPhraseDescriptor(),
  'randomCatchPhraseNoun': () => faker.company.catchPhraseNoun(),

  // ============================================
  // Database
  // ============================================
  'randomDatabaseColumn': () => faker.database.column(),
  'randomDatabaseType': () => faker.database.type(),
  'randomDatabaseCollation': () => faker.database.collation(),
  'randomDatabaseEngine': () => faker.database.engine(),

  // ============================================
  // Dates
  // ============================================
  'randomDateFuture': () => faker.date.future().toISOString(),
  'randomDatePast': () => faker.date.past().toISOString(),
  'randomDateRecent': () => faker.date.recent().toISOString(),
  'randomWeekday': () => faker.date.weekday(),
  'randomMonth': () => faker.date.month(),

  // ============================================
  // Files and System
  // ============================================
  'randomFileName': () => faker.system.fileName(),
  'randomFileType': () => faker.system.mimeType(),
  'randomFileExt': () => faker.system.fileExt(),
  'randomCommonFileName': () => faker.system.commonFileName(),
  'randomCommonFileType': () => faker.system.commonFileType(),
  'randomCommonFileExt': () => faker.system.commonFileExt(),
  'randomFilePath': () => faker.system.filePath(),
  'randomDirectoryPath': () => faker.system.directoryPath(),
  'randomMimeType': () => faker.system.mimeType(),

  // ============================================
  // Commerce
  // ============================================
  'randomPrice': () => faker.commerce.price(),
  'randomProduct': () => faker.commerce.product(),
  'randomProductAdjective': () => faker.commerce.productAdjective(),
  'randomProductMaterial': () => faker.commerce.productMaterial(),
  'randomProductName': () => faker.commerce.productName(),
  'randomDepartment': () => faker.commerce.department(),

  // ============================================
  // Hacker and Lorem
  // ============================================
  'randomNoun': () => faker.hacker.noun(),
  'randomVerb': () => faker.hacker.verb(),
  'randomIngverb': () => faker.hacker.ingverb(),
  'randomAdjective': () => faker.hacker.adjective(),
  'randomPhrase': () => faker.hacker.phrase(),
  'randomLoremWord': () => faker.lorem.word(),
  'randomLoremWords': () => faker.lorem.words(),
  'randomLoremSentence': () => faker.lorem.sentence(),
  'randomLoremSentences': () => faker.lorem.sentences(),
  'randomLoremParagraph': () => faker.lorem.paragraph(),
  'randomLoremParagraphs': () => faker.lorem.paragraphs(),
  'randomLoremText': () => faker.lorem.text(),
  'randomLoremSlug': () => faker.lorem.slug(),
  'randomLoremLines': () => faker.lorem.lines(),
};

/**
 * Generate a value for a Bruno dynamic variable
 * 
 * @param variableName - The variable name with or without the $ prefix (e.g., 'randomUUID' or '$randomUUID')
 * @returns The generated value as a string, or null if the variable is not recognized
 * 
 * @example
 * ```typescript
 * generateDynamicVariable('$randomUUID') // => '550e8400-e29b-41d4-a716-446655440000'
 * generateDynamicVariable('$randomEmail') // => 'john.doe@example.com'
 * generateDynamicVariable('$isoTimestamp') // => '2024-03-20T12:34:56.789Z'
 * ```
 */
export function generateDynamicVariable(variableName: string): string | null {
  // Remove $ prefix if present
  const cleanName = variableName.startsWith('$') ? variableName.slice(1) : variableName;
  
  const generator = dynamicVariableGenerators[cleanName];
  
  if (!generator) {
    return null;
  }
  
  try {
    const value = generator();
    return String(value);
  } catch (error) {
    console.error(`[Bruno Dynamic Variables] Error generating ${variableName}:`, error);
    return null;
  }
}

/**
 * Check if a variable name is a valid Bruno dynamic variable
 * 
 * @param variableName - The variable name with or without the $ prefix
 * @returns True if the variable is recognized as a dynamic variable
 * 
 * @example
 * ```typescript
 * isDynamicVariable('$randomUUID') // => true
 * isDynamicVariable('randomEmail') // => true
 * isDynamicVariable('$myCustomVar') // => false
 * isDynamicVariable('myEnvVar') // => false
 * ```
 */
export function isDynamicVariable(variableName: string): boolean {
  const cleanName = variableName.startsWith('$') ? variableName.slice(1) : variableName;
  return cleanName in dynamicVariableGenerators;
}

/**
 * Get a list of all supported Bruno dynamic variable names
 * 
 * @returns Array of all supported variable names (without $ prefix)
 */
export function getSupportedVariables(): string[] {
  return Object.keys(dynamicVariableGenerators).sort();
}

/**
 * Get the number of supported dynamic variables
 * 
 * @returns The count of supported variables
 */
export function getSupportedVariablesCount(): number {
  return Object.keys(dynamicVariableGenerators).length;
}
