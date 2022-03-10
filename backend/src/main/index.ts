import { ApolloServer } from 'apollo-server'
import { randomUUID } from 'crypto'
import 'reflect-metadata'
import { Arg, buildSchema, Field, Mutation, ObjectType, PubSub, PubSubEngine, Query, Resolver, Root, Subscription } from 'type-graphql'

const topics = {
  newMessage: 'NEW_MESSAGE'
}

@ObjectType()
export class Message {
  @Field()
  id: string

  @Field()
  message: string
}

const messages: Message[] = [{
  id: randomUUID(),
  message: 'first'
}]

const createMessage = (message: string) => {
  const newMessage: Message = {
    id: randomUUID(),
    message
  }
  messages.push(newMessage)
  return newMessage
}

@Resolver(() => Message)
export class MessageResolver {
  @Query(() => [Message])
  messages(): Message[] {
    return messages
  }

  @Mutation(() => Message)
  async sendMessage(
    @PubSub() pubSub: PubSubEngine,
    @Arg('message') message: string
  ): Promise<Message> {
    const newMessage = createMessage(message)
    await pubSub.publish(topics.newMessage, newMessage)
    return newMessage
  }

  @Subscription(() => Message, { topics: topics.newMessage })
  async subMessage(@Root() message: Message): Promise<Message> {
    return message
  }
}

(class StartApp {
  private static port = process.env.PORT || 6767
  private static subscriptionPath = process.env.SUBSCRIPTION_PATH || '/subscription'
  private static isDevMode = process.env.NODE_ENV !== 'production'

  static start = async (): Promise<void> => {
    const schema = await buildSchema({
      resolvers: [MessageResolver]
    })

    const server = new ApolloServer({
      schema,
      subscriptions: {
        path: this.subscriptionPath
      }
    })

    server.listen(this.port)
      .then(({ url }) => this.isDevMode && console.log(`Server running at: ${url}`))
      .catch(console.log)
  }
})
  .start()
