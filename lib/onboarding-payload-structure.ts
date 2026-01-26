// Onboarding Payload Structure
// Defines the sample payload, sections, and cross-references for the Payload Explorer

import { EntityType, entityColors } from './klarna-network-structure';

export { entityColors };

// Sample onboarding payload for multiple payment accounts
export const sampleOnboardingPayload = {
  partner_account_reference: "PA-2024-COOLBRAND-001",
  partner_account_name: "CoolBrand Inc.",
  partner_account_contact: {
    given_name: "John",
    family_name: "Doe",
    email: "john.doe@coolbrand.com",
    phone: "+18445527621"
  },
  products: [
    {
      type: "PAYMENT",
      payment_profile_id: "pp_standard_us_001",
      payment_accounts: [
        {
          payment_account_reference: "PA-ACC-001",
          payment_acquiring_account_id: "paa_us_west_001",
          default_merchant_category_code: "0744",
          partner_business_entity_reference: "BER_820479267321312",
          default_store_group_reference: "my-store-group-reference-ABC"
        },
        {
          payment_account_reference: "PA-ACC-002",
          payment_acquiring_account_id: "paa_us_west_001",
          default_merchant_category_code: "7995",
          partner_business_entity_reference: "BER_204985670291231",
          default_store_group_reference: "my-store-group-reference-XYZ"
        }
      ]
    }
  ],
  brands: [
    {
      brand_reference: "klarna_standard_offering",
      display_name: "Klarna Standard Offering",
      element: {
        logo_url: "https://example.com/logo.png",
        icon_url: "https://example.com/icon.png",
        feature_image_url: "https://example.com/feature.png"
      }
    },
    {
      brand_reference: "klarna_pay_in_full_non_guaranteed",
      display_name: "Klarna Pay in full (non guaranteed)",
      element: {
        logo_url: "https://example.com/logo2.png",
        icon_url: "https://example.com/icon2.png",
        feature_image_url: "https://example.com/feature2.png"
      }
    }
  ],
  store_groups: [
    {
      store_group_reference: "my-store-group-reference-ABC",
      support_contact: {
        email: "support@coolbrand.com",
        phone: "+18445527621",
        contact_form: "https://coolbrand.com/support"
      },
      social_media_links: [
        { provider: "FACEBOOK", url: "https://facebook.com/coolbrand" },
        { provider: "INSTAGRAM", url: "https://instagram.com/coolbrand" }
      ],
      brand_reference: "klarna_standard_offering",
      stores: [
        {
          store_reference: "store-online-main",
          type: "WEBSITE",
          url: "https://coolbrand.com"
        }
      ]
    },
    {
      store_group_reference: "my-store-group-reference-XYZ",
      support_contact: {
        email: "support@coolbrand.com",
        phone: "+18445527621",
        contact_form: "https://coolbrand.com/support"
      },
      social_media_links: [
        { provider: "FACEBOOK", url: "https://facebook.com/coolbrand" },
        { provider: "INSTAGRAM", url: "https://instagram.com/coolbrand" }
      ],
      brand_reference: "klarna_pay_in_full_non_guaranteed",
      stores: [
        {
          store_reference: "store-gaming",
          type: "WEBSITE",
          url: "https://gaming.coolbrand.com"
        }
      ]
    }
  ],
  supplementary_account_data: {
    account_creation: {
      account_created_from_ip: "192.168.2.1",
      account_created_at: "2025-01-01T12:00:00Z"
    }
  },
  partner_business_entities: [
    {
      partner_business_entity_reference: "BER_820479267321312",
      legal_registered_entity_name: "CoolBrand LLC",
      legal_registration_country: "US",
      supplementary_business_data: {
        legal_registration: {
          legal_registration_number: "HRA_12345ABC",
          legal_registration_authority: "Ohio Secretary of State",
          legal_registration_entity_type: "LIMITED_LIABILITY_COMPANY",
          tax_registration_number: "999-999-999",
          financial_conduct_authority_number: "123-456-789",
          legal_registration_address: {
            street_address: "800 N. High St",
            street_address2: "Ste. 400",
            postal_code: "43215",
            city: "Columbus",
            region: "OH",
            country: "US"
          }
        },
        operating_addresses: [
          {
            street_address: "800 N. High St",
            street_address2: "Ste. 400",
            postal_code: "43215",
            city: "Columbus",
            region: "OH",
            country: "US"
          }
        ],
        stakeholders: [
          {
            given_name: "John",
            family_name: "Doe",
            address: {
              street_address: "800 N. High St",
              street_address2: "Ste. 400",
              postal_code: "43215",
              city: "Columbus",
              region: "OH",
              country: "US"
            },
            date_of_birth: "1970-01-01",
            national_identification: {
              number: "999-999-9999",
              country: "US"
            },
            roles: ["OWNER"]
          }
        ],
        partner_payouts_state: {
          payouts_status: "ENABLED",
          payouts_enabled_at: "2024-01-01T12:00:00Z",
          payouts_delay_days: 1,
          bank_accounts: [
            {
              bank_account_type: "IBAN",
              account_holder: "CoolBrand LLC",
              bic: "NDEASEGGXXX",
              iban: "SE4550000000058398257466"
            }
          ]
        }
      }
    },
    {
      partner_business_entity_reference: "BER_204985670291231",
      legal_registered_entity_name: "CoolBrand Gaming Division",
      legal_registration_country: "US",
      supplementary_business_data: {
        legal_registration: {
          legal_registration_number: "HRA_67890XYZ",
          legal_registration_authority: "Ohio Secretary of State",
          legal_registration_entity_type: "LIMITED_LIABILITY_COMPANY",
          tax_registration_number: "888-888-888",
          financial_conduct_authority_number: "987-654-321",
          legal_registration_address: {
            street_address: "100 Gaming Ave",
            street_address2: "Floor 2",
            postal_code: "43215",
            city: "Columbus",
            region: "OH",
            country: "US"
          }
        },
        operating_addresses: [
          {
            street_address: "100 Gaming Ave",
            street_address2: "Floor 2",
            postal_code: "43215",
            city: "Columbus",
            region: "OH",
            country: "US"
          }
        ],
        stakeholders: [
          {
            given_name: "Jane",
            family_name: "Smith",
            address: {
              street_address: "100 Gaming Ave",
              street_address2: "Floor 2",
              postal_code: "43215",
              city: "Columbus",
              region: "OH",
              country: "US"
            },
            date_of_birth: "1985-06-15",
            national_identification: {
              number: "888-888-8888",
              country: "US"
            },
            roles: ["OWNER", "DIRECTOR"]
          }
        ],
        partner_payouts_state: {
          payouts_status: "ENABLED",
          payouts_enabled_at: "2024-01-01T12:00:00Z",
          payouts_delay_days: 1,
          bank_accounts: [
            {
              bank_account_type: "IBAN",
              account_holder: "CoolBrand Gaming Division",
              bic: "NDEASEGGXXX",
              iban: "SE4550000000058398257467"
            }
          ]
        }
      }
    }
  ]
};

// Payload section definition
export interface PayloadSection {
  id: string;
  path: string;                     // JSON path like "partner_account_contact"
  name: string;                     // Display name
  shortName: string;                // Short name for UI
  description: string;              // What this section does
  longDescription?: string;         // Detailed explanation
  entityType: EntityType;           // For color coding
  startLine: number;                // Line number in formatted JSON (1-based)
  endLine: number;                  // End line number
  referencesTo?: PayloadReference[];  // References this section makes
  referencedBy?: string[];          // Section IDs that reference this
  relatedEndpoints: string[];       // Endpoint IDs from klarna-endpoints.ts
  documentation?: string;           // Link to docs
}

export interface PayloadReference {
  targetSectionId: string;          // ID of the section being referenced
  fieldPath: string;                // Path to the reference field
  referenceValue: string;           // The actual reference value
  targetFieldPath: string;          // Path in target where value is defined
}

// All payload sections with their metadata
export const payloadSections: PayloadSection[] = [
  // ========== Top-Level Partner Account Fields ==========
  {
    id: 'partner-account-ref',
    path: 'partner_account_reference',
    name: 'Partner Account Reference',
    shortName: 'Account Ref',
    description: 'Your unique identifier for this Partner Account',
    longDescription: 'A unique reference you provide to identify this Partner Account in your system. This reference is used in subsequent API calls to identify the partner. It should be unique across all your partners.',
    entityType: 'account',
    startLine: 2,
    endLine: 2,
    relatedEndpoints: ['read-partner-account', 'update-partner-account'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-accounts/',
  },
  {
    id: 'partner-account-name',
    path: 'partner_account_name',
    name: 'Partner Account Name',
    shortName: 'Account Name',
    description: 'Display name of the Partner company',
    longDescription: 'The name of the Partner company as it should appear in Klarna systems. This is typically the trading name or brand name of the business.',
    entityType: 'account',
    startLine: 3,
    endLine: 3,
    relatedEndpoints: ['read-partner-account', 'update-partner-account'],
  },
  {
    id: 'partner-account-contact',
    path: 'partner_account_contact',
    name: 'Partner Account Contact',
    shortName: 'Contact',
    description: 'Main representative of the Partner for Klarna communications',
    longDescription: 'Contact information for the main representative of the Partner. Klarna uses these details if they need to reach out to the Partner directly for support, compliance, or operational matters.',
    entityType: 'config',
    startLine: 4,
    endLine: 9,
    relatedEndpoints: ['update-partner-account'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-accounts/',
  },

  // ========== Products Section ==========
  {
    id: 'products',
    path: 'products',
    name: 'Products',
    shortName: 'Products',
    description: 'Klarna products enabled for this Partner',
    longDescription: 'Array of Klarna products to enable for this Partner. Currently supports PAYMENT product type, which enables Klarna payment methods. Each product contains configuration including the Payment Profile and Payment Accounts.',
    entityType: 'product',
    startLine: 10,
    endLine: 30,
    relatedEndpoints: ['list-payment-products', 'disable-payment-product', 'reenable-payment-product'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-products/',
  },
  {
    id: 'payment-profile-id',
    path: 'products[0].payment_profile_id',
    name: 'Payment Profile ID',
    shortName: 'Profile ID',
    description: 'Reference to an Acquiring Partner\'s Payment Profile',
    longDescription: 'Links this Partner to a Payment Profile from your Payment Acquiring Product. The Payment Profile defines pricing (Price Plan) and available payment programs (Payment Program Plan). You create Payment Profiles as an Acquiring Partner before onboarding merchants.',
    entityType: 'profile',
    startLine: 13,
    endLine: 13,
    relatedEndpoints: ['list-payment-profiles'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-profiles/',
  },
  {
    id: 'payment-accounts',
    path: 'products[0].payment_accounts',
    name: 'Payment Accounts',
    shortName: 'Payment Accounts',
    description: 'Payment configuration units linking business entities to stores',
    longDescription: 'Payment Accounts represent a specific Partner configuration in Klarna Network. They are used on the Payments API to define how Payment Transactions are processed across the network, connecting data points such as the Partner Business Entity, the Merchant Category Code (MCC) and Branding to each transaction. At least one Payment Account is required to allow a Partner to process transactions through Klarna\'s Payment Products.',
    entityType: 'account',
    startLine: 14,
    endLine: 28,
    referencesTo: [
      {
        targetSectionId: 'partner-business-entities',
        fieldPath: 'products[0].payment_accounts[0].partner_business_entity_reference',
        referenceValue: 'BER_820479267321312',
        targetFieldPath: 'partner_business_entities[0].partner_business_entity_reference',
      },
      {
        targetSectionId: 'partner-business-entities',
        fieldPath: 'products[0].payment_accounts[1].partner_business_entity_reference',
        referenceValue: 'BER_204985670291231',
        targetFieldPath: 'partner_business_entities[1].partner_business_entity_reference',
      },
      {
        targetSectionId: 'store-groups',
        fieldPath: 'products[0].payment_accounts[0].default_store_group_reference',
        referenceValue: 'my-store-group-reference-ABC',
        targetFieldPath: 'store_groups[0].store_group_reference',
      },
      {
        targetSectionId: 'store-groups',
        fieldPath: 'products[0].payment_accounts[1].default_store_group_reference',
        referenceValue: 'my-store-group-reference-XYZ',
        targetFieldPath: 'store_groups[1].store_group_reference',
      },
    ],
    referenceBy: ['partner-business-entities', 'store-groups'],
    relatedEndpoints: ['list-payment-accounts', 'create-payment-account', 'update-payment-account'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-accounts/',
  },

  // ========== Payment Account Fields (Breakdown) ==========
  {
    id: 'payment-account-reference',
    path: 'products[0].payment_accounts[].payment_account_reference',
    name: 'Payment Account Reference',
    shortName: 'PA Reference',
    description: 'Your unique identifier for this Payment Account',
    longDescription: 'A unique string reference for the payment account, used by the partner to identify the payment account without relying on Klarna-generated IDs. This reference must be unique within your system and is used in subsequent API calls to identify specific payment configurations.',
    entityType: 'account',
    startLine: 16,
    endLine: 16,
    relatedEndpoints: ['list-payment-accounts', 'create-payment-account'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-accounts/',
  },
  {
    id: 'payment-acquiring-account-id',
    path: 'products[0].payment_accounts[].payment_acquiring_account_id',
    name: 'Payment Acquiring Account ID',
    shortName: 'Acquiring Account',
    description: 'External reference to an Acquiring Partner\'s Payment Acquiring Account',
    longDescription: 'A unique account identifier assigned by Klarna to an existing Payment Acquiring Account. This is an EXTERNAL reference - it is NOT defined in this payload but exists in the Acquiring Partner\'s account structure. The Payment Acquiring Account determines: (1) Which Settlement Configuration is applied to this Partner, and (2) Which Acquiring Legal Entity is the counterparty for Payment Transactions under this Payment Account. You obtain this ID from the List Payment Acquiring Accounts API.',
    entityType: 'credential',
    startLine: 17,
    endLine: 17,
    relatedEndpoints: ['list-acquiring-accounts'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/payment-acquiring-resources/payment-acquiring-accounts/',
  },
  {
    id: 'default-merchant-category-code',
    path: 'products[0].payment_accounts[].default_merchant_category_code',
    name: 'Merchant Category Code (MCC)',
    shortName: 'MCC',
    description: 'Four-digit code classifying the type of goods or services',
    longDescription: 'The Merchant Category Code (MCC) is a four-digit number used to classify the type of goods or services offered by a business. This code is used for payment processing, risk assessment, and regulatory compliance. Common examples: 5411 (Grocery Stores), 5812 (Restaurants), 5942 (Book Stores), 7995 (Gambling). The MCC affects which payment programs are available and may impact transaction fees.',
    entityType: 'config',
    startLine: 18,
    endLine: 18,
    relatedEndpoints: ['create-payment-account'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/merchant-category-codes/',
  },
  {
    id: 'partner-business-entity-reference-field',
    path: 'products[0].payment_accounts[].partner_business_entity_reference',
    name: 'Partner Business Entity Reference',
    shortName: 'PBE Reference',
    description: 'Reference to a Partner Business Entity defined in this payload',
    longDescription: 'Links this Payment Account to a specific Partner Business Entity defined in the partner_business_entities array of this payload. The referenced Business Entity identifies which legal entity is offering the service to the customer on the other side of the transaction. This defines the country or jurisdiction under which the Partner is legally incorporated or registered to conduct business, and determines settlement and compliance configuration.',
    entityType: 'entity',
    startLine: 19,
    endLine: 19,
    referencesTo: [
      {
        targetSectionId: 'partner-business-entities',
        fieldPath: 'products[0].payment_accounts[0].partner_business_entity_reference',
        referenceValue: 'BER_820479267321312',
        targetFieldPath: 'partner_business_entities[0].partner_business_entity_reference',
      },
    ],
    relatedEndpoints: ['list-business-entities', 'create-business-entity'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-business-entities/',
  },
  {
    id: 'default-store-group-reference-field',
    path: 'products[0].payment_accounts[].default_store_group_reference',
    name: 'Default Store Group Reference',
    shortName: 'Store Group Ref',
    description: 'Reference to a Store Group defined in this payload',
    longDescription: 'Links this Payment Account to a default Store Group defined in the store_groups array of this payload. The Store Group specifies which branding is applied to Payment Transactions processed through this Payment Account. This determines how the merchant appears to customers during checkout, including logos, icons, and support contact information.',
    entityType: 'store',
    startLine: 20,
    endLine: 20,
    referencesTo: [
      {
        targetSectionId: 'store-groups',
        fieldPath: 'products[0].payment_accounts[0].default_store_group_reference',
        referenceValue: 'my-store-group-reference-ABC',
        targetFieldPath: 'store_groups[0].store_group_reference',
      },
    ],
    relatedEndpoints: ['list-store-groups', 'create-store-group'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
  },

  // ========== Brands Section ==========
  {
    id: 'brands',
    path: 'brands',
    name: 'Brands',
    shortName: 'Brands',
    description: 'Consumer-facing brand identities',
    longDescription: 'Brands represent how the Partner appears to consumers. They include visual assets (logo, icon, feature image) and display names. Brands are referenced by Store Groups to give stores their consumer-facing identity. Multiple brands allow partners to operate different consumer-facing identities.',
    entityType: 'store',
    startLine: 32,
    endLine: 51,
    relatedEndpoints: ['list-brands', 'get-brand', 'create-brand', 'update-brand'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
  },

  // ========== Brand Fields (Breakdown) ==========
  {
    id: 'brand-reference',
    path: 'brands[].brand_reference',
    name: 'Brand Reference',
    shortName: 'Brand Ref',
    description: 'Your unique identifier for this Brand',
    longDescription: 'A unique reference you provide to identify this Brand. This reference is used by Store Groups to link to the correct brand identity. The brand_reference must be unique across all brands in your Partner Account.',
    entityType: 'store',
    startLine: 34,
    endLine: 34,
    relatedEndpoints: ['create-brand', 'get-brand'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
  },
  {
    id: 'brand-display-name',
    path: 'brands[].display_name',
    name: 'Brand Display Name',
    shortName: 'Display Name',
    description: 'Brand name displayed to customers',
    longDescription: 'The customer-facing name of the brand as it appears in Klarna\'s shopping experience. This is the name customers will see during checkout and in their purchase history.',
    entityType: 'store',
    startLine: 35,
    endLine: 35,
    relatedEndpoints: ['create-brand', 'update-brand'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
  },

  // ========== Stores Section ==========
  {
    id: 'stores',
    path: 'store_groups[].stores',
    name: 'Stores',
    shortName: 'Stores',
    description: 'Where customers interact with Klarna payment services',
    longDescription: 'Stores define where customers can use Klarna\'s payment services via a Partner. Each store must include a unique store_reference provided by the Acquiring Partner. This reference lets Klarna correctly associate payments and fraud checks with the right store identity. Store types include: WEBSITE (online store), PHYSICAL_STORE (brick-and-mortar location), and MOBILE_APP (mobile application). Channel-specific details are provided such as url for websites, address for physical stores, or platform and bundle_names for mobile apps.',
    entityType: 'store',
    startLine: 71,
    endLine: 77,
    relatedEndpoints: ['create-store', 'list-stores', 'get-store', 'update-store'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
  },

  // ========== Store Groups Section ==========
  {
    id: 'store-groups',
    path: 'store_groups',
    name: 'Store Groups',
    shortName: 'Store Groups',
    description: 'Groups of stores sharing a brand identity',
    longDescription: 'Store Groups organize stores under a common brand identity and support configuration. Each Store Group references a Brand for visual identity and contains one or more Stores. Payment Accounts reference Store Groups as their default store configuration.',
    entityType: 'store',
    startLine: 52,
    endLine: 105,
    referencedBy: ['payment-accounts'],
    relatedEndpoints: ['list-store-groups', 'get-store-group', 'create-store-group', 'update-store-group'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
  },

  // ========== Store Group Fields (Breakdown) ==========
  {
    id: 'store-group-reference',
    path: 'store_groups[].store_group_reference',
    name: 'Store Group Reference',
    shortName: 'SG Reference',
    description: 'Your unique identifier for this Store Group',
    longDescription: 'A unique reference you provide to identify this Store Group. This reference is used by Payment Accounts to link to the correct store configuration. The store_group_reference must be unique across all store groups in your Partner Account.',
    entityType: 'store',
    startLine: 54,
    endLine: 54,
    relatedEndpoints: ['create-store-group', 'get-store-group'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
  },
  {
    id: 'brand-reference-field',
    path: 'store_groups[].brand_reference',
    name: 'Brand Reference (in Store Group)',
    shortName: 'Brand Ref',
    description: 'Reference to a Brand defined in this payload',
    longDescription: 'Links this Store Group to a specific Brand defined in the brands array of this payload. The referenced Brand provides the visual identity (logos, icons, display name) that customers will see for all stores in this group. This determines how the merchant\'s brand appears during checkout and in customer communications.',
    entityType: 'store',
    startLine: 70,
    endLine: 70,
    referencesTo: [
      {
        targetSectionId: 'brands',
        fieldPath: 'store_groups[0].brand_reference',
        referenceValue: 'klarna_standard_offering',
        targetFieldPath: 'brands[0].brand_reference',
      },
      {
        targetSectionId: 'brands',
        fieldPath: 'store_groups[1].brand_reference',
        referenceValue: 'klarna_pay_in_full_non_guaranteed',
        targetFieldPath: 'brands[1].brand_reference',
      },
    ],
    relatedEndpoints: ['create-store-group', 'update-store-group'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
  },
  {
    id: 'store-group-stores-field',
    path: 'store_groups[].stores',
    name: 'Stores (in Store Group)',
    shortName: 'Stores',
    description: 'Array of stores belonging to this Store Group',
    longDescription: 'One or more stores that share this Store Group\'s brand identity and configuration. Each store represents a channel (website, mobile app, or physical location) where customers can use Klarna payment services.',
    entityType: 'store',
    startLine: 71,
    endLine: 77,
    relatedEndpoints: ['create-store', 'list-stores'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-stores-and-brands/',
  },

  // ========== Supplementary Account Data ==========
  {
    id: 'supplementary-account-data',
    path: 'supplementary_account_data',
    name: 'Supplementary Account Data',
    shortName: 'Supplementary Data',
    description: 'Additional account metadata for compliance',
    longDescription: 'Optional additional data about the Partner Account for compliance and fraud prevention. Includes information about when and from where the account was created. This helps Klarna with risk assessment and regulatory compliance.',
    entityType: 'config',
    startLine: 89,
    endLine: 94,
    relatedEndpoints: ['onboard-partner'],
  },

  // ========== Partner Business Entities Section ==========
  {
    id: 'partner-business-entities',
    path: 'partner_business_entities',
    name: 'Partner Business Entities',
    shortName: 'Business Entities',
    description: 'Legal entities associated with the Partner',
    longDescription: 'Partner Business Entities represent the legal entities behind the Partner. Each contains legal registration details (company registration, tax ID), stakeholder information (owners, directors), operating addresses, and bank account details for settlements. Payment Accounts reference Business Entities to link payment configuration to a specific legal entity.',
    entityType: 'entity',
    startLine: 95,
    endLine: 187,
    referencedBy: ['payment-accounts'],
    relatedEndpoints: ['list-business-entities', 'get-business-entity', 'create-business-entity', 'update-business-entity'],
    documentation: 'https://docs.klarna.com/klarna-network-distribution/onboard-and-manage-your-partners/accounts-resources/partner-business-entities/',
  },
];

// Helper to get section by ID
export function getSectionById(id: string): PayloadSection | undefined {
  return payloadSections.find(section => section.id === id);
}

// Helper to get all references from a section
export function getSectionReferences(sectionId: string): PayloadReference[] {
  const section = getSectionById(sectionId);
  return section?.referencesTo || [];
}

// Helper to get sections that reference a given section
export function getSectionsReferencingSection(targetSectionId: string): PayloadSection[] {
  return payloadSections.filter(section => 
    section.referencesTo?.some(ref => ref.targetSectionId === targetSectionId)
  );
}

// Cross-reference definitions for drawing lines
export interface CrossReference {
  id: string;
  fromSectionId: string;
  toSectionId: string;
  fromPath: string;
  toPath: string;
  value: string;
  color: string;
}

// All cross-references in the payload
export const crossReferences: CrossReference[] = [
  // Payment Account -> Business Entity references
  {
    id: 'pa1-to-pbe1',
    fromSectionId: 'payment-accounts',
    toSectionId: 'partner-business-entities',
    fromPath: 'products[0].payment_accounts[0].partner_business_entity_reference',
    toPath: 'partner_business_entities[0].partner_business_entity_reference',
    value: 'BER_820479267321312',
    color: entityColors.entity.border,
  },
  {
    id: 'pa2-to-pbe2',
    fromSectionId: 'payment-accounts',
    toSectionId: 'partner-business-entities',
    fromPath: 'products[0].payment_accounts[1].partner_business_entity_reference',
    toPath: 'partner_business_entities[1].partner_business_entity_reference',
    value: 'BER_204985670291231',
    color: entityColors.entity.border,
  },
  // Payment Account -> Store Group references
  {
    id: 'pa1-to-sg1',
    fromSectionId: 'payment-accounts',
    toSectionId: 'store-groups',
    fromPath: 'products[0].payment_accounts[0].default_store_group_reference',
    toPath: 'store_groups[0].store_group_reference',
    value: 'my-store-group-reference-ABC',
    color: entityColors.store.border,
  },
  {
    id: 'pa2-to-sg2',
    fromSectionId: 'payment-accounts',
    toSectionId: 'store-groups',
    fromPath: 'products[0].payment_accounts[1].default_store_group_reference',
    toPath: 'store_groups[1].store_group_reference',
    value: 'my-store-group-reference-XYZ',
    color: entityColors.store.border,
  },
  // Granular field references: PBE Reference Field -> Business Entities
  {
    id: 'pbe-ref-field-to-pbe',
    fromSectionId: 'partner-business-entity-reference-field',
    toSectionId: 'partner-business-entities',
    fromPath: 'products[0].payment_accounts[].partner_business_entity_reference',
    toPath: 'partner_business_entities[].partner_business_entity_reference',
    value: 'BER_*',
    color: entityColors.entity.border,
  },
  // Granular field references: Store Group Reference Field -> Store Groups
  {
    id: 'sg-ref-field-to-sg',
    fromSectionId: 'default-store-group-reference-field',
    toSectionId: 'store-groups',
    fromPath: 'products[0].payment_accounts[].default_store_group_reference',
    toPath: 'store_groups[].store_group_reference',
    value: 'my-store-group-reference-*',
    color: entityColors.store.border,
  },
  // Store Group -> Brand references
  {
    id: 'sg1-to-brand1',
    fromSectionId: 'store-groups',
    toSectionId: 'brands',
    fromPath: 'store_groups[0].brand_reference',
    toPath: 'brands[0].brand_reference',
    value: 'klarna_standard_offering',
    color: entityColors.store.border,
  },
  {
    id: 'sg2-to-brand2',
    fromSectionId: 'store-groups',
    toSectionId: 'brands',
    fromPath: 'store_groups[1].brand_reference',
    toPath: 'brands[1].brand_reference',
    value: 'klarna_pay_in_full_non_guaranteed',
    color: entityColors.store.border,
  },
  // Granular field references: Brand Reference Field -> Brands
  {
    id: 'brand-ref-field-to-brands',
    fromSectionId: 'brand-reference-field',
    toSectionId: 'brands',
    fromPath: 'store_groups[].brand_reference',
    toPath: 'brands[].brand_reference',
    value: 'klarna_*',
    color: entityColors.store.border,
  },
  // Granular field references: Brand Reference Field -> Brand Reference
  {
    id: 'brand-ref-field-to-brand-ref',
    fromSectionId: 'brand-reference-field',
    toSectionId: 'brand-reference',
    fromPath: 'store_groups[].brand_reference',
    toPath: 'brands[].brand_reference',
    value: 'klarna_*',
    color: entityColors.store.border,
  },
];

// Get cross-references involving a section
export function getCrossReferencesForSection(sectionId: string): CrossReference[] {
  return crossReferences.filter(
    ref => ref.fromSectionId === sectionId || ref.toSectionId === sectionId
  );
}

// Format the payload as indented JSON string for display
export const formattedPayloadJson = JSON.stringify(sampleOnboardingPayload, null, 2);

// Get line ranges for syntax highlighting regions
export interface HighlightRegion {
  sectionId: string;
  startLine: number;
  endLine: number;
  entityType: EntityType;
}

// Calculate actual line numbers by parsing the formatted JSON
export function calculateLineNumbers(): Map<string, { start: number; end: number }> {
  const lines = formattedPayloadJson.split('\n');
  const lineMap = new Map<string, { start: number; end: number }>();
  
  // Track brace/bracket depth for nested structures
  let depth = 0;
  const keyStack: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Check for key matches
    if (line.includes('"partner_account_reference"')) {
      lineMap.set('partner-account-ref', { start: lineNum, end: lineNum });
    }
    if (line.includes('"partner_account_name"')) {
      lineMap.set('partner-account-name', { start: lineNum, end: lineNum });
    }
    if (line.includes('"partner_account_contact"')) {
      const endLine = findClosingBrace(lines, i);
      lineMap.set('partner-account-contact', { start: lineNum, end: endLine + 1 });
    }
    if (line.includes('"products"')) {
      const endLine = findClosingBracket(lines, i);
      lineMap.set('products', { start: lineNum, end: endLine + 1 });
    }
    if (line.includes('"payment_profile_id"')) {
      lineMap.set('payment-profile-id', { start: lineNum, end: lineNum });
    }
    if (line.includes('"payment_accounts"')) {
      const endLine = findClosingBracket(lines, i);
      lineMap.set('payment-accounts', { start: lineNum, end: endLine + 1 });
    }
    // Payment Account individual fields
    if (line.includes('"payment_account_reference"')) {
      lineMap.set('payment-account-reference', { start: lineNum, end: lineNum });
    }
    if (line.includes('"payment_acquiring_account_id"')) {
      lineMap.set('payment-acquiring-account-id', { start: lineNum, end: lineNum });
    }
    if (line.includes('"default_merchant_category_code"')) {
      lineMap.set('default-merchant-category-code', { start: lineNum, end: lineNum });
    }
    if (line.includes('"partner_business_entity_reference"') && !line.includes('partner_business_entities')) {
      lineMap.set('partner-business-entity-reference-field', { start: lineNum, end: lineNum });
    }
    if (line.includes('"default_store_group_reference"')) {
      lineMap.set('default-store-group-reference-field', { start: lineNum, end: lineNum });
    }
    if (line.includes('"brands"') && !line.includes('brand_reference')) {
      const endLine = findClosingBracket(lines, i);
      lineMap.set('brands', { start: lineNum, end: endLine + 1 });
    }
    // Brand fields
    if (line.includes('"brand_reference"') && !line.includes('store_groups')) {
      lineMap.set('brand-reference', { start: lineNum, end: lineNum });
    }
    if (line.includes('"display_name"') && !line.includes('partner_account')) {
      lineMap.set('brand-display-name', { start: lineNum, end: lineNum });
    }
    if (line.includes('"stores"') && !line.includes('store_group') && !line.includes('store_reference')) {
      const endLine = findClosingBracket(lines, i);
      lineMap.set('stores', { start: lineNum, end: endLine + 1 });
    }
    if (line.includes('"store_groups"')) {
      const endLine = findClosingBracket(lines, i);
      lineMap.set('store-groups', { start: lineNum, end: endLine + 1 });
    }
    // Store Group fields
    if (line.includes('"store_group_reference"')) {
      lineMap.set('store-group-reference', { start: lineNum, end: lineNum });
    }
    if (line.includes('"brand_reference"') && line.includes(':')) {
      // This catches brand_reference within store_groups
      const contextLines = lines.slice(Math.max(0, i - 10), i).join('\n');
      if (contextLines.includes('store_groups')) {
        lineMap.set('brand-reference-field', { start: lineNum, end: lineNum });
      }
    }
    if (line.includes('"stores"') && line.includes(':') && lines[i - 1] && !lines[i - 1].includes('store_groups')) {
      const contextLines = lines.slice(Math.max(0, i - 5), i).join('\n');
      if (contextLines.includes('store_group_reference')) {
        const endLine = findClosingBracket(lines, i);
        lineMap.set('store-group-stores-field', { start: lineNum, end: endLine + 1 });
      }
    }
    if (line.includes('"supplementary_account_data"')) {
      const endLine = findClosingBrace(lines, i);
      lineMap.set('supplementary-account-data', { start: lineNum, end: endLine + 1 });
    }
    if (line.includes('"partner_business_entities"')) {
      const endLine = findClosingBracket(lines, i);
      lineMap.set('partner-business-entities', { start: lineNum, end: endLine + 1 });
    }
  }
  
  return lineMap;
}

// Helper to find closing brace for objects
function findClosingBrace(lines: string[], startIndex: number): number {
  let depth = 0;
  let started = false;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === '{') {
        depth++;
        started = true;
      } else if (char === '}') {
        depth--;
        if (started && depth === 0) {
          return i;
        }
      }
    }
  }
  return lines.length - 1;
}

// Helper to find closing bracket for arrays
function findClosingBracket(lines: string[], startIndex: number): number {
  let depth = 0;
  let started = false;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    for (const char of line) {
      if (char === '[') {
        depth++;
        started = true;
      } else if (char === ']') {
        depth--;
        if (started && depth === 0) {
          return i;
        }
      }
    }
  }
  return lines.length - 1;
}
