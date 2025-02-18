import logger from 'decentraland-gatsby/dist/entities/Development/logger'
import type { EmbedBuilder } from 'discord.js'

import { DISCORD_SERVICE_ENABLED } from '../constants'
import { getProfileUrl } from '../entities/Profile/utils'
import { ProposalType } from '../entities/Proposal/types'
import { isGovernanceProcessProposal, proposalUrl } from '../entities/Proposal/utils'
import UpdateModel from '../entities/Updates/model'
import { UpdateAttributes } from '../entities/Updates/types'
import { getPublicUpdates, getUpdateNumber, getUpdateUrl } from '../entities/Updates/utils'
import { capitalizeFirstLetter, inBackground } from '../helpers'
import { getProfile } from '../utils/Catalyst'
import { ErrorCategory } from '../utils/errorCategories'
import { isProdEnv } from '../utils/governanceEnvs'

import { ErrorService } from './ErrorService'

const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID
const TOKEN = process.env.DISCORD_TOKEN

const Discord = DISCORD_SERVICE_ENABLED ? require('discord.js') : null

const DCL_LOGO = 'https://decentraland.org/images/decentraland.png'
const DEFAULT_AVATAR = 'https://decentraland.org/images/male.png'
const BLANK = '\u200B'
const PREVIEW_MAX_LENGTH = 140

type Field = {
  name: string
  value: string
}

enum MessageColors {
  NEW_PROPOSAL = 0x0099ff,
  FINISH_PROPOSAL = 0x8142f5,
  NEW_UPDATE = 0x00ff80,
}

type EmbedMessageProps = {
  title: string
  proposalType?: ProposalType
  description?: string
  fields: Field[]
  user?: string
  action: string
  color: MessageColors
  url: string
}

function getChoices(choices: string[]): Field[] {
  return choices.map((choice, idx) => ({
    name: `Option #${idx + 1}`,
    value: capitalizeFirstLetter(choice),
  }))
}

function getPreviewText(text: string) {
  return text.length > PREVIEW_MAX_LENGTH ? text.slice(0, PREVIEW_MAX_LENGTH) + '...' : text
}

export class DiscordService {
  private static client: any
  static init() {
    if (!DISCORD_SERVICE_ENABLED) {
      logger.log('Discord service disabled')
      return
    }

    if (!TOKEN) {
      throw new Error('Discord token missing')
    }

    this.client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds] })
    this.client.login(TOKEN)
  }

  private static get channel() {
    if (!CHANNEL_ID) {
      throw new Error('Discord channel ID not set')
    }

    const channel = this.client.channels.cache.get(CHANNEL_ID)

    if (!channel) {
      throw new Error(`Discord channel not found: ${CHANNEL_ID}`)
    }

    if (channel?.type !== Discord.ChannelType.GuildText && channel?.type !== Discord.ChannelType.GuildAnnouncement) {
      throw new Error(`Discord channel type is not supported: ${channel?.type}`)
    }

    return channel
  }

  private static async formatMessage({
    title,
    proposalType,
    description,
    fields: choices,
    user,
    action,
    color,
    url,
  }: EmbedMessageProps) {
    const fields: Field[] = []

    if (!!proposalType && !!description) {
      const embedDescription = !isGovernanceProcessProposal(proposalType)
        ? description.split('\n')[0]
        : getPreviewText(description)

      fields.push({
        name: proposalType.toUpperCase().replaceAll('_', ' '),
        value: embedDescription,
      })
    }

    if (choices.length > 0) {
      fields.push({ name: BLANK, value: BLANK }, ...choices)
    }

    const embed = new Discord.EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setURL(url)
      .setDescription(action)
      .setThumbnail(DCL_LOGO)
      .addFields(...fields)
      .setTimestamp()
      .setFooter({ text: 'Decentraland DAO', iconURL: DCL_LOGO })

    if (user) {
      try {
        const profile = await getProfile(user)
        const profileHasName = !!profile && !!profile.name && profile.name.length > 0
        const displayableUser = profileHasName ? profile.name : user

        const hasAvatar = !!profile && !!profile.avatar

        embed.setAuthor({
          name: displayableUser,
          iconURL: hasAvatar ? profile.avatar.snapshots.face256 : DEFAULT_AVATAR,
          url: getProfileUrl(user),
        })
      } catch (error) {
        console.error(`Error loading profile for user ${user}`, error)
        embed.setAuthor({
          name: user,
          iconURL: DEFAULT_AVATAR,
          url: getProfileUrl(user),
        })
      }
    }

    return embed
  }

  private static async sendMessages(messages: EmbedBuilder[]) {
    const sentMessage = await this.channel.send({ embeds: messages })
    if (this.channel.type === Discord.ChannelType.GuildAnnouncement) {
      await sentMessage.crosspost()
    }
  }

  static newProposal(
    proposalId: string,
    title: string,
    type: ProposalType,
    description: string,
    choices: string[],
    user: string
  ) {
    if (DISCORD_SERVICE_ENABLED) {
      const action = 'A new proposal has been created'
      const embedChoices = getChoices(choices)
      inBackground(async () => {
        const message = await this.formatMessage({
          url: proposalUrl(proposalId),
          title,
          proposalType: type,
          description,
          fields: embedChoices,
          user,
          action,
          color: MessageColors.NEW_PROPOSAL,
        })
        try {
          await this.sendMessages([message])
          return { action, proposalId }
        } catch (error) {
          throw new Error(`[Error sending message to Discord - New proposal] ID ${proposalId}, Error: ${error}`)
        }
      })
    }
  }

  static newUpdate(proposalId: string, proposalTitle: string, updateId: string, user: string) {
    if (DISCORD_SERVICE_ENABLED) {
      inBackground(async () => {
        try {
          const publicUpdates = getPublicUpdates(await UpdateModel.find<UpdateAttributes>({ proposal_id: proposalId }))
          const updateNumber = getUpdateNumber(publicUpdates, updateId)
          const updateIdx = publicUpdates.length - updateNumber

          if (isNaN(updateNumber)) {
            throw new Error(`Update with id ${updateId} not found`)
          }

          const { health, introduction, highlights, blockers, next_steps } = publicUpdates[updateIdx]

          if (!health || !introduction || !highlights || !blockers || !next_steps) {
            throw new Error('Missing update fields for Discord message')
          }

          const action = 'A new update has been created'
          const title = `Update #${updateNumber}: ${proposalTitle}`
          const message = await this.formatMessage({
            url: getUpdateUrl(updateId, proposalId),
            title,
            fields: [
              { name: 'Project Health', value: getPreviewText(health) },
              { name: 'Introduction', value: getPreviewText(introduction) },
              { name: 'Highlights', value: getPreviewText(highlights) },
              { name: 'Blockers', value: getPreviewText(blockers) },
              { name: 'Next Steps', value: getPreviewText(next_steps) },
            ],
            user,
            action,
            color: MessageColors.NEW_UPDATE,
          })
          await this.sendMessages([message])
          return { action, updateId }
        } catch (error) {
          throw new Error(`[Error sending message to Discord - New update] ID ${updateId}, Error: ${error}`)
        }
      })
    }
  }

  static finishProposal(id: string, title: string, outcome: string, winnerChoice?: string) {
    if (DISCORD_SERVICE_ENABLED) {
      inBackground(async () => {
        const action = `Proposal has ended with outcome ${outcome}`
        const message = await this.formatMessage({
          url: proposalUrl(id),
          title,
          fields: winnerChoice ? [{ name: 'Result', value: capitalizeFirstLetter(winnerChoice) }] : [],
          action,
          color: MessageColors.FINISH_PROPOSAL,
        })
        try {
          await this.sendMessages([message])
          return { action, proposalId: id }
        } catch (error) {
          if (isProdEnv()) {
            ErrorService.report(`Error sending finish proposal message to Discord`, {
              proposalId: id,
              error,
              category: ErrorCategory.Discord,
            })
          }
        }
      })
    }
  }
}
