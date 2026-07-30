import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AuthenticationShellComponent } from '@client/features/authentication/authentication-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AuthenticationShellComponent],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
