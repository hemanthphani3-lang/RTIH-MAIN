import { redirect } from 'next/navigation';

export default function RegisterPage() {
  // Redirect standalone register to the consolidated Onboarding Wizard
  redirect('/org/onboarding');
}
