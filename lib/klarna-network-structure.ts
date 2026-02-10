// Klarna Network Account Structure Data
// Defines entities, relationships, and endpoint mappings for the interactive diagram

export type EntityType = 
  | 'account' 
  | 'product' 
  | 'entity' 
  | 'store' 
  | 'profile' 
  | 'config'
  | 'credential';

export type ViewType = 'partner' | 'acquirer';

export interface NetworkEntity {
  id: string;
  name: string;
  type: EntityType;
  description: string;
  longDescription?: string;
  endpoints: string[]; // IDs from klarna-endpoints.ts
  documentation?: string;
  views: ViewType[]; // Which views this entity appears in
  /** Optional display name per view (e.g. "Acquirer Partner Account" in acquirer view) */
  displayNameByView?: Partial<Record<ViewType, string>>;
}

export interface EntityRelationship {
  id: string;
  from: string;
  to: string;
  cardinality: '1:1' | '1:n' | 'n:1' | 'n:m';
  label: string;
  description?: string;
  views: ViewType[];
}

// Entity colors by type
export const entityColors: Record<EntityType, { bg: string; border: string; text: string }> = {
  account: { bg: '#EBF5FF', border: '#3B82F6', text: '#1E40AF' },
  product: { bg: '#F0FDF4', border: '#22C55E', text: '#166534' },
  entity: { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309' },
  store: { bg: '#FCE7F3', border: '#EC4899', text: '#BE185D' },
  profile: { bg: '#E0E7FF', border: '#6366F1', text: '#4338CA' },
  config: { bg: '#F3E8FF', border: '#A855F7', text: '#7C3AED' },
  credential: { bg: '#ECFDF5', border: '#10B981', text: '#047857' },
};

// All network entities
export const networkEntities: NetworkEntity[] = [
  // ========== Partner View Entities ==========
  {
    id: 'partner-account',
    name: 'Partner Account',
    type: 'account',
    description: 'Represents a Partner company in Klarna',
    longDescription: 'A Partner Account represents either an Acquiring Partner or a Partner working with Klarna. It is the core object that allows a Partner to operate in the Klarna Payment Network. Each Partner Account holds the core data that identifies the Partner, acts as the parent for Partner Products, and connects to shared resources.',
    endpoints: [],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-accounts/',
    views: ['partner', 'acquirer'],
    displayNameByView: { acquirer: 'Acquirer Partner Account' },
  },
  {
    id: 'partner-account-contact',
    name: 'Partner Account Contact',
    type: 'config',
    description: 'Main representative of the Partner for Klarna',
    longDescription: 'Information about the main representative of the Partner for Klarna. Klarna uses these details if they need to reach out to the Partner directly.',
    endpoints: ['update-partner-account'],
    views: ['partner'],
  },
  {
    id: 'payment-product',
    name: 'Payment Product',
    type: 'product',
    description: "Klarna's payments offering for a Partner Account",
    longDescription: "The Payment Product represents Klarna's payments offering for a Partner Account, including pricing and all available Payment Programs. Each Payment Product is connected to a Payment Profile which specifies pricing and Payment Programs.",
    endpoints: ['list-payment-products', 'disable-payment-product', 'reenable-payment-product'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-products/',
    views: ['partner'],
  },
  {
    id: 'partner-business-entity',
    name: 'Partner Business Entity',
    type: 'entity',
    description: 'Represents a legal entity related to the Partner',
    longDescription: 'A Partner Business Entity represents a legal entity related to the Partner, including information Klarna needs for compliance, fraud prevention, and settlement. It contains legal entity details, stakeholder information, and bank account details.',
    endpoints: ['list-business-entities', 'get-business-entity', 'create-business-entity', 'update-business-entity'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-business-entities/',
    views: ['partner'],
  },
  {
    id: 'payment-account',
    name: 'Payment Account',
    type: 'account',
    description: 'Connects business entities to payment configuration',
    longDescription: 'Payment Accounts are used to assign identifiers to specific Partner configurations including MCCs, Brands, Store Groups, Partner Business Entity, and other payment configuration details. They support complex account structures with multiple legal entities, stores, and brands.',
    endpoints: ['list-payment-accounts', 'create-payment-account', 'update-payment-account'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-accounts/',
    views: ['partner'],
  },
  {
    id: 'brand',
    name: 'Brand',
    type: 'store',
    description: 'Consumer representation of a company',
    longDescription: 'Brands are the consumer representation of a company, including visual assets and links. They enhance customer experience and support Klarna\'s fraud and risk controls.',
    endpoints: ['list-brands', 'get-brand', 'create-brand', 'update-brand'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
    views: ['partner'],
  },
  {
    id: 'store-group',
    name: 'Store Group',
    type: 'store',
    description: 'Groups stores under one brand identity',
    longDescription: 'Store Groups allow multiple stores to share one brand identity. They connect stores to brands and are referenced by Payment Accounts.',
    endpoints: ['list-store-groups', 'get-store-group', 'create-store-group', 'update-store-group'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
    views: ['partner'],
  },
  {
    id: 'store',
    name: 'Store',
    type: 'store',
    description: 'Physical or digital location where Klarna is available',
    longDescription: 'Stores represent locations (physical or digital) where Klarna\'s products and services are made available by Partners. They can be websites, mobile apps, or physical store locations.',
    endpoints: ['list-stores', 'get-store', 'create-store', 'update-store'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
    views: ['partner'],
  },
  {
    id: 'payment-program-enablement',
    name: 'Payment Program Enablement',
    type: 'config',
    description: 'Enables specific payment programs for a Payment Account',
    longDescription: 'Payment Program Enablements connect Payment Programs to Payment Accounts, determining which Klarna payment options are available to customers.',
    endpoints: ['list-payment-program-enablements', 'get-payment-program-enablement', 'create-payment-program-enablement', 'delete-payment-program-enablement'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-program-enablements/',
    views: ['partner'],
  },

  // ========== Acquirer View Entities ==========
  {
    id: 'payment-acquiring-product',
    name: 'Payment Acquiring Product',
    type: 'product',
    description: "Acquiring Partner's acquiring offering in Klarna",
    longDescription: "A Payment Acquiring Product represents an Acquiring Partner's acquiring offering in the Klarna Payment Network. It enables the Acquiring Partner to onboard and manage its own Partners within Klarna, holding Payment Profiles and Payment Acquiring Accounts. This resource is created and maintained internally by Klarna - no public API operations are available.",
    endpoints: [],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-acquiring-products/',
    views: ['acquirer'],
  },
  {
    id: 'payment-acquiring-account',
    name: 'Payment Acquiring Account',
    type: 'account',
    description: 'Links legal entity to settlement configuration',
    longDescription: 'A Payment Acquiring Account links one of your acquiring legal entities to a specific Settlement configuration in Klarna\'s systems. Each acquiring legal entity has at least one Payment Acquiring Account.',
    endpoints: ['list-acquiring-accounts'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-acquiring-accounts/',
    views: ['acquirer'],
  },
  {
    id: 'payment-profile',
    name: 'Payment Profile',
    type: 'profile',
    description: 'Defines Price Plan and Payment Program Plan combination',
    longDescription: 'A Payment Profile defines the combination of a Price Plan and a Payment Program Plan that you apply when onboarding a Partner. This lets you standardize how pricing and Payment Programs are applied across your portfolio.',
    endpoints: ['list-payment-profiles'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-profiles/',
    views: ['acquirer'],
  },
  {
    id: 'price-plan',
    name: 'Price Plan',
    type: 'profile',
    description: 'Contains pricing information and rates',
    longDescription: 'Price Plans contain the pricing information including price rates applied to Partners. They define how much Partners pay for using Klarna services.',
    endpoints: ['list-price-plans', 'get-price-plan'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/price-plans/',
    views: ['acquirer'],
  },
  {
    id: 'payment-program-plan',
    name: 'Payment Program Plan',
    type: 'profile',
    description: 'Connects Klarna payment programs to partners',
    longDescription: 'Payment Program Plans connect the different Klarna payment programs to partners. They define which payment options are available through a Payment Profile.',
    endpoints: ['list-payment-program-plans', 'list-payment-programs'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-program-plans/',
    views: ['acquirer'],
  },
  {
    id: 'settlement-config',
    name: 'Settlement Configuration',
    type: 'config',
    description: 'Defines how funds flow between Klarna and partners',
    longDescription: 'Settlement configuration defines how funds flow between Klarna and acquiring partners. It controls settlement timing, currency, and bank account details.',
    endpoints: [],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/settlement-resources/settlement-configuration/',
    views: ['acquirer'],
  },

  // ========== Shared/Credential Entities ==========
  {
    id: 'api-keys',
    name: 'API Keys',
    type: 'credential',
    description: 'Server-side authentication credentials',
    longDescription: 'API Keys are used for server-to-server authentication when calling Klarna APIs. They provide basic authentication using API key and secret pairs. API Keys can be created, updated, and disabled as needed, and should be stored securely on your backend servers.',
    endpoints: ['list-api-keys', 'get-api-key', 'create-api-key', 'update-api-key', 'disable-api-key'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/setup-your-integration/connection-configuration/manage-your-api-credentials/',
    views: ['partner', 'acquirer'],
  },
  {
    id: 'client-identifiers',
    name: 'Client Identifiers',
    type: 'credential',
    description: 'Client-side SDK authentication',
    longDescription: 'Client Identifiers are used for client-side integrations with Klarna SDKs, such as hosted checkout pages, embedded payment elements, and mobile SDKs. They include configuration like allowed domains to restrict which websites can use the identifier. Unlike API Keys, Client Identifiers are safe to expose in frontend code.',
    endpoints: ['list-client-ids', 'create-client-id', 'get-client-id', 'update-client-id', 'disable-client-id'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/setup-your-integration/connection-configuration/manage-your-api-credentials/',
    views: ['partner', 'acquirer'],
  },
  {
    id: 'client-certificates',
    name: 'Client Certificates',
    type: 'credential',
    description: 'mTLS and JWT signing certificates',
    longDescription: 'Client Certificates enable enhanced security through mutual TLS (mTLS) authentication, where both Klarna and your servers verify each other\'s identity using certificates. They can also be used for JWT signing. mTLS provides stronger security than API Keys by requiring certificate-based authentication for all API requests.',
    endpoints: ['list-certificates', 'create-mtls-certificate', 'create-jwt-certificate', 'get-client-certificate', 'update-client-certificate', 'revoke-client-certificate', 'mtls-enforcement-status', 'enforce-mtls', 'remove-mtls-enforcement'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/setup-your-integration/connection-configuration/configure-mtls/',
    views: ['acquirer'],
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    type: 'config',
    description: 'Event notification subscriptions',
    longDescription: 'Webhooks allow you to receive real-time notifications about events in the Klarna system, such as payment state changes, partner account updates, and settlement notifications. You configure webhook URLs and the events you want to subscribe to.',
    endpoints: ['list-webhooks', 'create-webhook', 'get-webhook', 'update-webhook', 'delete-webhook', 'simulate-webhook', 'list-signing-keys', 'create-signing-key', 'get-signing-key', 'delete-signing-key'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/setup-your-integration/connection-configuration/setup-your-webhooks/',
    views: ['partner', 'acquirer'],
  },
];

// Relationships between entities
export const entityRelationships: EntityRelationship[] = [
  // Partner View Relationships
  {
    id: 'partner-to-contact',
    from: 'partner-account',
    to: 'partner-account-contact',
    cardinality: '1:1',
    label: 'defines',
    description: 'Each Partner Account defines one contact',
    views: ['partner'],
  },
  {
    id: 'partner-to-payment-product',
    from: 'partner-account',
    to: 'payment-product',
    cardinality: '1:1',
    label: 'defines',
    description: 'Each Partner Account defines one Payment Product',
    views: ['partner'],
  },
  {
    id: 'partner-to-business-entity',
    from: 'partner-account',
    to: 'partner-business-entity',
    cardinality: '1:n',
    label: 'manages',
    description: 'Partner manages multiple legal entities',
    views: ['partner'],
  },
  {
    id: 'partner-to-brand',
    from: 'partner-account',
    to: 'brand',
    cardinality: '1:n',
    label: 'manages',
    description: 'Partner manages multiple brands',
    views: ['partner'],
  },
  {
    id: 'partner-to-store-group',
    from: 'partner-account',
    to: 'store-group',
    cardinality: '1:n',
    label: 'manages',
    description: 'Partner manages multiple store groups',
    views: ['partner'],
  },
  {
    id: 'payment-product-to-payment-account',
    from: 'payment-product',
    to: 'payment-account',
    cardinality: '1:n',
    label: 'aggregates',
    description: 'Payment Product aggregates multiple Payment Accounts',
    views: ['partner'],
  },
  {
    id: 'payment-account-to-business-entity',
    from: 'payment-account',
    to: 'partner-business-entity',
    cardinality: 'n:1',
    label: 'references',
    description: 'Payment Account links to a Business Entity',
    views: ['partner'],
  },
  {
    id: 'payment-account-to-store-group',
    from: 'payment-account',
    to: 'store-group',
    cardinality: 'n:1',
    label: 'default',
    description: 'Payment Account has a default Store Group',
    views: ['partner'],
  },
  {
    id: 'store-group-to-store',
    from: 'store-group',
    to: 'store',
    cardinality: '1:n',
    label: 'aggregates',
    description: 'Store Group aggregates multiple Stores',
    views: ['partner'],
  },
  {
    id: 'store-group-to-brand',
    from: 'store-group',
    to: 'brand',
    cardinality: 'n:1',
    label: 'references',
    description: 'Store Group references a Brand identity',
    views: ['partner'],
  },
  {
    id: 'enablement-to-payment-account',
    from: 'payment-program-enablement',
    to: 'payment-account',
    cardinality: 'n:1',
    label: 'extends',
    description: 'Payment Program Enablement extends Payment Account',
    views: ['partner'],
  },
  {
    id: 'partner-to-api-keys',
    from: 'partner-account',
    to: 'api-keys',
    cardinality: '1:n',
    label: 'manages',
    description: 'Partner manages multiple API Keys for server-side authentication',
    views: ['partner'],
  },
  {
    id: 'partner-to-client-ids',
    from: 'partner-account',
    to: 'client-identifiers',
    cardinality: '1:n',
    label: 'manages',
    description: 'Partner manages Client Identifiers for SDK integrations',
    views: ['partner'],
  },
  {
    id: 'partner-to-webhooks',
    from: 'partner-account',
    to: 'webhooks',
    cardinality: '1:n',
    label: 'configures',
    description: 'Partner configures Webhooks for event notifications',
    views: ['partner'],
  },

  // Acquirer View Relationships
  {
    id: 'acquirer-to-acquiring-product',
    from: 'partner-account',
    to: 'payment-acquiring-product',
    cardinality: '1:1',
    label: 'defines',
    description: 'Acquirer defines one Payment Acquiring Product',
    views: ['acquirer'],
  },
  {
    id: 'acquiring-product-to-profile',
    from: 'payment-acquiring-product',
    to: 'payment-profile',
    cardinality: '1:n',
    label: 'provides',
    description: 'Acquiring Product provides multiple Payment Profiles',
    views: ['acquirer'],
  },
  {
    id: 'acquiring-product-to-acquiring-account',
    from: 'payment-acquiring-product',
    to: 'payment-acquiring-account',
    cardinality: '1:n',
    label: 'provides',
    description: 'Acquiring Product provides multiple Acquiring Accounts',
    views: ['acquirer'],
  },
  {
    id: 'profile-to-price-plan',
    from: 'payment-profile',
    to: 'price-plan',
    cardinality: 'n:1',
    label: 'references',
    description: 'Profile references a Price Plan',
    views: ['acquirer'],
  },
  {
    id: 'profile-to-program-plan',
    from: 'payment-profile',
    to: 'payment-program-plan',
    cardinality: 'n:1',
    label: 'references',
    description: 'Profile references a Payment Program Plan',
    views: ['acquirer'],
  },
  {
    id: 'acquiring-account-to-settlement',
    from: 'payment-acquiring-account',
    to: 'settlement-config',
    cardinality: 'n:1',
    label: 'references',
    description: 'Acquiring Account references Settlement Config',
    views: ['acquirer'],
  },
  {
    id: 'acquirer-to-api-keys',
    from: 'partner-account',
    to: 'api-keys',
    cardinality: '1:n',
    label: 'manages',
    description: 'Account manages multiple API Keys for server-side authentication',
    views: ['acquirer'],
  },
  {
    id: 'acquirer-to-client-ids',
    from: 'partner-account',
    to: 'client-identifiers',
    cardinality: '1:n',
    label: 'manages',
    description: 'Account manages Client Identifiers for SDK integrations',
    views: ['acquirer'],
  },
  {
    id: 'acquirer-to-client-certs',
    from: 'partner-account',
    to: 'client-certificates',
    cardinality: '1:n',
    label: 'manages',
    description: 'Account manages Client Certificates for mTLS authentication',
    views: ['acquirer'],
  },
  {
    id: 'acquirer-to-webhooks',
    from: 'partner-account',
    to: 'webhooks',
    cardinality: '1:n',
    label: 'configures',
    description: 'Account configures Webhooks for event notifications',
    views: ['acquirer'],
  },
];

// Helper functions
export function getEntitiesForView(view: ViewType): NetworkEntity[] {
  return networkEntities.filter(entity => entity.views.includes(view));
}

export function getRelationshipsForView(view: ViewType): EntityRelationship[] {
  return entityRelationships.filter(rel => rel.views.includes(view));
}

export function getEntityById(id: string): NetworkEntity | undefined {
  return networkEntities.find(entity => entity.id === id);
}

export function getRelatedEndpoints(entityId: string): string[] {
  const entity = getEntityById(entityId);
  return entity?.endpoints || [];
}

// Node positions for layout (can be overridden by dagre)
export const defaultNodePositions: Record<ViewType, Record<string, { x: number; y: number }>> = {
  partner: {
    'partner-account': { x: 400, y: 0 },
    'partner-account-contact': { x: 50, y: 150 },
    'payment-product': { x: 500, y: 150 },
    'partner-business-entity': { x: 850, y: 150 },
    'brand': { x: 200, y: 600 },
    'payment-account': { x: 500, y: 400 },
    'store-group': { x: 100, y: 450 },
    'store': { x: 0, y: 600 },
    'payment-program-enablement': { x: 850, y: 250 },
    'api-keys': { x: 1075, y: 150 },
    'client-identifiers': { x: 1250, y: 150 },
    'webhooks': { x: 1425, y: 150 },
  },
  acquirer: {
    'partner-account': { x: 400, y: 0 },
    'payment-acquiring-product': { x: 50, y: 150 },
    'payment-profile': { x: -50, y: 320 },
    'payment-acquiring-account': { x: 400, y: 320 },
    'price-plan': { x: -100, y: 460 },
    'payment-program-plan': { x: 100, y: 460 },
    'settlement-config': { x: 400, y: 460 },
    'api-keys': { x: 300, y: 150 },
    'client-identifiers': { x: 500, y: 150 },
    'client-certificates': { x: 700, y: 150 },
    'webhooks': { x: 900, y: 150 },
  },
};
