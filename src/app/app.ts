import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Shell } from './shared/components/shell/shell';
import { Toast } from './shared/components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Shell, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
