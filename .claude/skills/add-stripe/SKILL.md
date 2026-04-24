---
name: add-stripe
description: >-
  Adds Stripe SDK, config, webhook endpoints, and optional connected accounts
  to the NestJS project. Interactively asks whether to support connected
  accounts, account webhooks, connected account webhooks, and payment method
  (checkout / payment intent / both). Use when the user asks to add Stripe,
  payments, or billing to the project.
---

# Add Stripe

Interactive setup for Stripe payments. **Ask the user** the following questions before generating any code, then follow the conditional steps based on answers.

## Questions to ask

Use `AskQuestion` (or ask conversationally) for each:

1. **Connected accounts?** -- Does the project need Stripe Connect (connected accounts)? (Yes / No)
2. **Account webhooks?** -- Add webhook endpoint for the main Stripe account? (Yes / No)
3. _(Only if Q2 = Yes)_ **Payment method?** -- Which payment flow? (Checkout / Payment Intent / Both)
4. _(Only if Q1 = Yes)_ **Connected account webhooks?** -- Add webhook endpoint for connected accounts? (Yes / No)
5. _(Only if Q4 = Yes)_ **Connected payment method?** -- Which payment flow for connected accounts? (Checkout / Payment Intent / Both)

---

## Step 1: Install packages

```bash
npm install stripe
```

## Step 2: Create `src/config/stripe.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  connectedWebhookSecret?: string;
}

export default registerAs(
  'stripe',
  (): StripeConfig => ({
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    connectedWebhookSecret:
      process.env.STRIPE_CONNECTED_WEBHOOK_SECRET || undefined,
  }),
);
```

## Step 3: Update `src/config/env.validation.ts`

Add before the closing `});`:

```typescript
  /* Stripe configuration */
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  STRIPE_CONNECTED_WEBHOOK_SECRET: Joi.string().optional(),
```

If connected account webhooks are **not** needed, omit the `STRIPE_CONNECTED_WEBHOOK_SECRET` line.

## Step 4: Append to the active env file

```
#Stripe Credentials
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

If connected account webhooks are needed, also add:

```
STRIPE_CONNECTED_WEBHOOK_SECRET=
```

## Step 5: Enable raw body in `src/main.ts`

Change the `NestFactory.create` call to:

```typescript
const app = await NestFactory.create(AppModule, { rawBody: true });
```

This makes `req.rawBody` available in webhook controllers for signature verification.

## Step 6: Create the Stripe module and service

### `src/stripe/stripe.module.ts`

Start with the base module. You will add controllers and providers to it as you go through the conditional steps.

```typescript
import { Module } from '@nestjs/common';
import { StripeService } from './providers/stripe.service';

@Module({
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
```

### `src/stripe/providers/stripe.service.ts`

```typescript
import { StripeConfig } from '@/config/stripe.config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService implements OnModuleInit {
  public stripe: Stripe;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const config = this.configService.get<StripeConfig>('stripe');
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2026-03-25.dahlia',
    });
  }
}
```

## Step 7: Wire into `src/app.module.ts`

1. Add imports at the top:

```typescript
import stripeConfig from './config/stripe.config';
import { StripeModule } from './stripe/stripe.module';
```

2. Add `stripeConfig` to the `load` array:

```typescript
load: [databaseConfig, appConfig, mailConfig, stripeConfig],
```

3. Add `StripeModule` to the `imports` array.

---

## Conditional: Connected accounts (if Q1 = Yes)

### Create `src/stripe/entities/connected-account.entity.ts`

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class ConnectedAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, nullable: false })
  stripe_account_id: string;

  @Column({ type: 'boolean', default: false })
  charges_enabled: boolean;

  @Column({ type: 'boolean', default: false })
  payouts_enabled: boolean;

  @Column({ type: 'boolean', default: false })
  details_submitted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### Update `src/stripe/stripe.module.ts`

Add `TypeOrmModule.forFeature([ConnectedAccount])` to imports:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectedAccount } from './entities/connected-account.entity';
import { StripeService } from './providers/stripe.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConnectedAccount])],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
```

### Inform the user about the relation

Tell the user:

> You need to add a `@OneToOne` relation between `ConnectedAccount` and the entity you want to associate it with (usually `User`). Here is an example:
>
> In `src/users/entities/user.entity.ts`, add:
>
> ```typescript
> import { ConnectedAccount } from '@/stripe/entities/connected-account.entity';
>
> // inside the User class:
> @OneToOne(() => ConnectedAccount, (account) => account.user)
> connectedAccount: ConnectedAccount;
> ```
>
> In `src/stripe/entities/connected-account.entity.ts`, add:
>
> ```typescript
> import { User } from '@/users/entities/user.entity';
>
> // inside the ConnectedAccount class:
> @OneToOne(() => User, (user) => user.connectedAccount, {
>   onDelete: 'CASCADE',
> })
> @JoinColumn()
> user: User;
> ```

Do **not** apply this relation automatically -- let the user decide the target entity.

---

## Conditional: Account webhooks (if Q2 = Yes)

### Create `src/stripe/stripe-webhook.controller.ts`

```typescript
import { Auth } from '@/auths/decorators/auth.decorator';
import { AuthType } from '@/auths/enums/auth-type.enum';
import { StripeConfig } from '@/config/stripe.config';
import {
  BadRequestException,
  Controller,
  Post,
  RawBody,
  Headers,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import Stripe from 'stripe';
import { StripeService } from './providers/stripe.service';

@ApiExcludeController()
@Auth(AuthType.None)
@Controller('stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    const config = this.configService.get<StripeConfig>('stripe');
    let event: Stripe.Event;

    try {
      event = this.stripeService.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        config.webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }

    await this.handleEvent(event);
    return { received: true };
  }

  private async handleEvent(event: Stripe.Event) {
    // AGENT: add cases below based on selected payment method
    switch (event.type) {
    }
  }
}
```

Add this controller to `stripe.module.ts` `controllers` array.

### If payment method = Checkout (or Both)

Add to the `switch` in `handleEvent`:

```typescript
      case 'checkout.session.completed':
        await this.checkoutWebhookProvider.handleSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'checkout.session.expired':
        await this.checkoutWebhookProvider.handleSessionExpired(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
```

Create `src/stripe/providers/checkout-webhook.provider.ts`:

```typescript
import { handleError } from '@/common/error-handlers/error.handler';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class CheckoutWebhookProvider {
  async handleSessionCompleted(session: Stripe.Checkout.Session) {
    try {
      // TODO: implement checkout.session.completed logic
      console.log('checkout.session.completed', session.id);
    } catch (err) {
      handleError(err);
    }
  }

  async handleSessionExpired(session: Stripe.Checkout.Session) {
    try {
      // TODO: implement checkout.session.expired logic
      console.log('checkout.session.expired', session.id);
    } catch (err) {
      handleError(err);
    }
  }
}
```

Inject `CheckoutWebhookProvider` into `StripeWebhookController` and register it in `stripe.module.ts` providers.

### If payment method = Payment Intent (or Both)

Add to the `switch` in `handleEvent`:

```typescript
      case 'payment_intent.succeeded':
        await this.paymentIntentWebhookProvider.handleSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case 'payment_intent.payment_failed':
        await this.paymentIntentWebhookProvider.handleFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
```

Create `src/stripe/providers/payment-intent-webhook.provider.ts`:

```typescript
import { handleError } from '@/common/error-handlers/error.handler';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentIntentWebhookProvider {
  async handleSucceeded(paymentIntent: Stripe.PaymentIntent) {
    try {
      // TODO: implement payment_intent.succeeded logic
      console.log('payment_intent.succeeded', paymentIntent.id);
    } catch (err) {
      handleError(err);
    }
  }

  async handleFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      // TODO: implement payment_intent.payment_failed logic
      console.log('payment_intent.payment_failed', paymentIntent.id);
    } catch (err) {
      handleError(err);
    }
  }
}
```

Inject `PaymentIntentWebhookProvider` into `StripeWebhookController` and register it in `stripe.module.ts` providers.

---

## Conditional: Connected account webhooks (if Q1 = Yes AND Q4 = Yes)

### Create `src/stripe/stripe-connected-webhook.controller.ts`

Same pattern as the account webhook controller but uses `connectedWebhookSecret` and a different route:

```typescript
import { Auth } from '@/auths/decorators/auth.decorator';
import { AuthType } from '@/auths/enums/auth-type.enum';
import { StripeConfig } from '@/config/stripe.config';
import {
  BadRequestException,
  Controller,
  Post,
  RawBody,
  Headers,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import Stripe from 'stripe';
import { StripeService } from './providers/stripe.service';

@ApiExcludeController()
@Auth(AuthType.None)
@Controller('stripe')
export class StripeConnectedWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  @Post('connected-webhook')
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    const config = this.configService.get<StripeConfig>('stripe');
    let event: Stripe.Event;

    try {
      event = this.stripeService.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        config.connectedWebhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }

    await this.handleEvent(event);
    return { received: true };
  }

  private async handleEvent(event: Stripe.Event) {
    // AGENT: add cases below based on selected payment method
    switch (event.type) {
    }
  }
}
```

Add this controller to `stripe.module.ts` `controllers` array.

### If connected payment method = Checkout (or Both)

Create `src/stripe/providers/connected-checkout-webhook.provider.ts`:

```typescript
import { handleError } from '@/common/error-handlers/error.handler';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class ConnectedCheckoutWebhookProvider {
  async handleSessionCompleted(session: Stripe.Checkout.Session) {
    try {
      // TODO: implement connected checkout.session.completed logic
      console.log('connected checkout.session.completed', session.id);
    } catch (err) {
      handleError(err);
    }
  }

  async handleSessionExpired(session: Stripe.Checkout.Session) {
    try {
      // TODO: implement connected checkout.session.expired logic
      console.log('connected checkout.session.expired', session.id);
    } catch (err) {
      handleError(err);
    }
  }
}
```

Add the same `checkout.session.completed` / `checkout.session.expired` switch cases in `StripeConnectedWebhookController.handleEvent`, injecting `ConnectedCheckoutWebhookProvider`.

### If connected payment method = Payment Intent (or Both)

Create `src/stripe/providers/connected-payment-intent-webhook.provider.ts`:

```typescript
import { handleError } from '@/common/error-handlers/error.handler';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class ConnectedPaymentIntentWebhookProvider {
  async handleSucceeded(paymentIntent: Stripe.PaymentIntent) {
    try {
      // TODO: implement connected payment_intent.succeeded logic
      console.log('connected payment_intent.succeeded', paymentIntent.id);
    } catch (err) {
      handleError(err);
    }
  }

  async handleFailed(paymentIntent: Stripe.PaymentIntent) {
    try {
      // TODO: implement connected payment_intent.payment_failed logic
      console.log('connected payment_intent.payment_failed', paymentIntent.id);
    } catch (err) {
      handleError(err);
    }
  }
}
```

Add the same `payment_intent.succeeded` / `payment_intent.payment_failed` switch cases in `StripeConnectedWebhookController.handleEvent`, injecting `ConnectedPaymentIntentWebhookProvider`.

---

## Final: Assemble `stripe.module.ts`

After all conditional steps, the final module should include **all** controllers and providers that were created. Example with everything enabled:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectedAccount } from './entities/connected-account.entity';
import { StripeService } from './providers/stripe.service';
import { CheckoutWebhookProvider } from './providers/checkout-webhook.provider';
import { PaymentIntentWebhookProvider } from './providers/payment-intent-webhook.provider';
import { ConnectedCheckoutWebhookProvider } from './providers/connected-checkout-webhook.provider';
import { ConnectedPaymentIntentWebhookProvider } from './providers/connected-payment-intent-webhook.provider';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeConnectedWebhookController } from './stripe-connected-webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConnectedAccount])],
  controllers: [StripeWebhookController, StripeConnectedWebhookController],
  providers: [
    StripeService,
    CheckoutWebhookProvider,
    PaymentIntentWebhookProvider,
    ConnectedCheckoutWebhookProvider,
    ConnectedPaymentIntentWebhookProvider,
  ],
  exports: [StripeService],
})
export class StripeModule {}
```

Only include the pieces that match the user's answers. Omit `TypeOrmModule`, controllers, or providers that were not selected.

## Verification

After completing all steps, run:

```bash
npm run build
```

Confirm zero errors before finishing.
