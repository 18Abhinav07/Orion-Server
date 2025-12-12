import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { LicenseTermsCache } from '../models/LicenseTermsCache';
import logger from '../utils/logger';

dotenv.config();

/**
 * Story Protocol License Terms Presets
 * These are common license configurations pre-registered on Story Protocol
 * to reduce gas costs and simplify licensing.
 */
const STORY_PROTOCOL_PRESETS = [
  {
    licenseType: 'commercial_remix',
    royaltyPercent: 10,
    licenseTermsId: '10', // Story Protocol preset ID for commercial remix with 10% royalty
    transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000001', // Genesis/system tx
    description: 'Commercial use with derivatives allowed, 10% royalty'
  },
  {
    licenseType: 'commercial_remix',
    royaltyPercent: 20,
    licenseTermsId: '20', // Story Protocol preset ID for commercial remix with 20% royalty
    transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000002', // Genesis/system tx
    description: 'Commercial use with derivatives allowed, 20% royalty'
  },
  {
    licenseType: 'non_commercial',
    royaltyPercent: 0,
    licenseTermsId: '1', // Story Protocol preset ID for non-commercial with 0% royalty
    transactionHash: '0x0000000000000000000000000000000000000000000000000000000000000003', // Genesis/system tx
    description: 'Non-commercial use with derivatives allowed, 0% royalty'
  }
];

async function seedLicenseTerms() {
  try {
    logger.info('Starting Story Protocol license terms seeding...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Clear existing presets (optional - comment out to preserve existing data)
    // await LicenseTermsCache.deleteMany({});
    // logger.info('Cleared existing license terms cache');

    // Insert presets
    let created = 0;
    let skipped = 0;

    for (const preset of STORY_PROTOCOL_PRESETS) {
      try {
        const existing = await LicenseTermsCache.findOne({
          licenseType: preset.licenseType,
          royaltyPercent: preset.royaltyPercent
        });

        if (existing) {
          logger.info(`Preset already exists: ${preset.licenseType} ${preset.royaltyPercent}% (ID: ${existing.licenseTermsId})`);
          skipped++;
        } else {
          const newPreset = new LicenseTermsCache(preset);
          await newPreset.save();
          logger.info(`✅ Created preset: ${preset.licenseType} ${preset.royaltyPercent}% (ID: ${preset.licenseTermsId})`);
          created++;
        }
      } catch (error: any) {
        if (error.code === 11000) {
          // Duplicate key error - already exists
          logger.warn(`Preset already exists (duplicate): ${preset.licenseType} ${preset.royaltyPercent}%`);
          skipped++;
        } else {
          throw error;
        }
      }
    }

    logger.info(`\n✅ Seeding complete!`);
    logger.info(`   Created: ${created} presets`);
    logger.info(`   Skipped: ${skipped} presets (already exist)`);
    logger.info(`   Total:   ${STORY_PROTOCOL_PRESETS.length} presets\n`);

    // Display all cached terms
    const allTerms = await LicenseTermsCache.find({}).sort({ licenseType: 1, royaltyPercent: 1 });
    logger.info('Current license terms cache:');
    allTerms.forEach((term: any) => {
      logger.info(`  - ${term.licenseType} ${term.royaltyPercent}% → ID: ${term.licenseTermsId}`);
    });

    process.exit(0);
  } catch (error: any) {
    logger.error(`Error seeding license terms: ${error.message}`);
    process.exit(1);
  }
}

// Run seeder
seedLicenseTerms();
