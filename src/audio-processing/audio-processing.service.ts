import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as musicMetadata from 'music-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mp3Cutter = require('mp3-cutter');

export interface AudioInfo {
  durationSec: number;
  format: string;
  bitrate?: number;
}

@Injectable()
export class AudioProcessingService {
  private readonly logger = new Logger(AudioProcessingService.name);

  /**
   * Get audio file metadata (duration, format, bitrate)
   */
  async getAudioInfo(buffer: Buffer, originalFilename?: string): Promise<AudioInfo> {
    try {
      const metadata = await musicMetadata.parseBuffer(buffer, {
        mimeType: this.getMimeType(originalFilename),
      });

      return {
        durationSec: Math.round(metadata.format.duration ?? 0),
        format: metadata.format.container ?? 'unknown',
        bitrate: metadata.format.bitrate
          ? Math.round(metadata.format.bitrate / 1000)
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get audio info: ${error.message}`);
      throw new InternalServerErrorException(
        `Audio info extraction failed: ${error.message}`,
      );
    }
  }

  /**
   * Generate a preview by cutting the first N seconds of an audio file
   */
  async generatePreview(
    buffer: Buffer,
    durationSec: number = 45,
    originalFilename?: string,
  ): Promise<{ buffer: Buffer; durationSec: number }> {
    const tempId = randomUUID();
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input-${tempId}.mp3`);
    const outputPath = path.join(tempDir, `preview-${tempId}.mp3`);

    try {
      // Write buffer to temp file
      await fs.promises.writeFile(inputPath, buffer);
      this.logger.debug(`Temp input file created: ${inputPath}`);

      // Get actual duration to avoid cutting beyond file length
      const audioInfo = await this.getAudioInfo(buffer, originalFilename);
      const actualDuration = Math.min(durationSec, audioInfo.durationSec);

      // Cut the MP3 file
      await this.cutMp3(inputPath, outputPath, 0, actualDuration);
      this.logger.debug(`Preview generated: ${outputPath}`);

      // Read the output file
      const previewBuffer = await fs.promises.readFile(outputPath);
      this.logger.log(
        `Preview created: ${previewBuffer.length} bytes, ${actualDuration}s`,
      );

      return {
        buffer: previewBuffer,
        durationSec: actualDuration,
      };
    } catch (error) {
      this.logger.error(`Failed to generate preview: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Audio preview generation failed: ${error.message}`,
      );
    } finally {
      // Cleanup temp files
      await this.cleanupTempFile(inputPath);
      await this.cleanupTempFile(outputPath);
    }
  }

  /**
   * Cut MP3 file using mp3-cutter (pure JS, no ffmpeg)
   */
  private cutMp3(
    inputPath: string,
    outputPath: string,
    startSec: number,
    endSec: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        mp3Cutter.cut({
          src: inputPath,
          target: outputPath,
          start: startSec,
          end: endSec,
        });
        // mp3-cutter is synchronous but returns immediately
        // Check if output file exists
        setTimeout(() => {
          if (fs.existsSync(outputPath)) {
            resolve();
          } else {
            reject(new Error('Output file not created'));
          }
        }, 100);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename?: string): string | undefined {
    if (!filename) return undefined;
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
    };
    return mimeTypes[ext];
  }

  /**
   * Cleanup temp file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
      this.logger.debug(`Cleaned up temp file: ${filePath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.warn(`Failed to cleanup temp file ${filePath}: ${error.message}`);
      }
    }
  }
}
