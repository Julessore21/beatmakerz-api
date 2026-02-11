import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

export interface AudioInfo {
  durationSec: number;
  format: string;
  bitrate?: number;
}

@Injectable()
export class AudioProcessingService {
  private readonly logger = new Logger(AudioProcessingService.name);

  /**
   * Génère une preview audio en extrayant les N premières secondes
   * @param buffer - Buffer du fichier audio source
   * @param durationSec - Durée de la preview en secondes (default: 45)
   * @param originalFilename - Nom original du fichier pour détecter le format
   * @returns Buffer de la preview audio
   */
  async generatePreview(
    buffer: Buffer,
    durationSec: number = 45,
    originalFilename?: string,
  ): Promise<{ buffer: Buffer; durationSec: number }> {
    const tempId = randomUUID();
    const tempDir = os.tmpdir();

    // Déterminer l'extension du fichier d'entrée
    const inputExt = originalFilename
      ? path.extname(originalFilename).toLowerCase() || '.mp3'
      : '.mp3';

    const inputPath = path.join(tempDir, `input-${tempId}${inputExt}`);
    const outputPath = path.join(tempDir, `preview-${tempId}.mp3`);

    try {
      // Écrire le buffer dans un fichier temporaire
      await fs.promises.writeFile(inputPath, buffer);
      this.logger.debug(`Temp input file created: ${inputPath}`);

      // Générer la preview avec ffmpeg
      await this.runFfmpeg(inputPath, outputPath, durationSec);
      this.logger.debug(`Preview generated: ${outputPath}`);

      // Lire le fichier de sortie
      const previewBuffer = await fs.promises.readFile(outputPath);
      this.logger.log(`Preview created successfully: ${previewBuffer.length} bytes`);

      return {
        buffer: previewBuffer,
        durationSec,
      };
    } catch (error) {
      this.logger.error(`Failed to generate preview: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Audio preview generation failed: ${error.message}`,
      );
    } finally {
      // Nettoyer les fichiers temporaires
      await this.cleanupTempFile(inputPath);
      await this.cleanupTempFile(outputPath);
    }
  }

  /**
   * Obtient les informations d'un fichier audio (durée, format, bitrate)
   */
  async getAudioInfo(buffer: Buffer, originalFilename?: string): Promise<AudioInfo> {
    const tempId = randomUUID();
    const tempDir = os.tmpdir();
    const inputExt = originalFilename
      ? path.extname(originalFilename).toLowerCase() || '.mp3'
      : '.mp3';
    const inputPath = path.join(tempDir, `probe-${tempId}${inputExt}`);

    try {
      await fs.promises.writeFile(inputPath, buffer);

      return await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
          if (err) {
            reject(new Error(`ffprobe failed: ${err.message}`));
            return;
          }

          const duration = metadata.format?.duration ?? 0;
          const format = metadata.format?.format_name ?? 'unknown';
          const bitrate = metadata.format?.bit_rate
            ? Math.round(metadata.format.bit_rate / 1000)
            : undefined;

          resolve({
            durationSec: Math.round(duration),
            format,
            bitrate,
          });
        });
      });
    } catch (error) {
      this.logger.error(`Failed to get audio info: ${error.message}`);
      throw new InternalServerErrorException(
        `Audio info extraction failed: ${error.message}`,
      );
    } finally {
      await this.cleanupTempFile(inputPath);
    }
  }

  /**
   * Exécute ffmpeg pour générer la preview
   */
  private runFfmpeg(
    inputPath: string,
    outputPath: string,
    durationSec: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputFormat('mp3')
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .duration(durationSec)
        .on('start', (commandLine) => {
          this.logger.debug(`ffmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            this.logger.debug(`Processing: ${Math.round(progress.percent)}%`);
          }
        })
        .on('error', (err) => {
          this.logger.error(`ffmpeg error: ${err.message}`);
          reject(new Error(`ffmpeg processing failed: ${err.message}`));
        })
        .on('end', () => {
          this.logger.debug('ffmpeg processing completed');
          resolve();
        })
        .save(outputPath);
    });
  }

  /**
   * Nettoie un fichier temporaire
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
      this.logger.debug(`Cleaned up temp file: ${filePath}`);
    } catch (error) {
      // Ignorer si le fichier n'existe pas
      if (error.code !== 'ENOENT') {
        this.logger.warn(`Failed to cleanup temp file ${filePath}: ${error.message}`);
      }
    }
  }
}
